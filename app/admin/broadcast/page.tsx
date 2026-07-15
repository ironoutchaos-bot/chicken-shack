'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAdminAuth } from '@/app/admin/_hooks/useAdminAuth'
import { AdminChecking, AdminLoginForm } from '@/app/admin/_hooks/AdminGate'

// ─── Types ───────────────────────────────────────────────────────────────────

type Recipient = {
  id: string
  phone: string
  name: string | null
  totalOrders: number
}

// ─── Image compression (avoid Vercel 4.5 MB body limit) ───────────────────────

function compressImage(file: File, maxPx: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx }
        else                 { width = Math.round(width * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
  return phone
}

/** Builds the per-recipient message: replaces {name} and appends the image link. */
function buildMessage(template: string, imageUrl: string, r: Recipient): string {
  const firstName = (r.name ?? '').trim().split(/\s+/)[0] || 'there'
  let msg = template.replace(/\{name\}/gi, firstName)
  if (imageUrl) msg += `\n\n${imageUrl}`
  return msg
}

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const intl   = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
}

const SENT_KEY = 'bf-broadcast-sent'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBroadcastPage() {
  const [loginErr, setLoginErr] = useState('')
  const [logging,  setLogging]  = useState(false)

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading,    setLoading]    = useState(false)

  const [message,  setMessage]  = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  // 'all' = everyone, 'customers' = only those with ≥1 order
  const [audience, setAudience] = useState<'all' | 'customers'>('all')
  const [sent, setSent] = useState<Record<string, boolean>>({})

  const loadRecipients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Not authorized')
      const data = await res.json()
      const list: Recipient[] = (Array.isArray(data) ? data : [])
        .filter((u: { phone?: string }) => u.phone && u.phone.replace(/\D/g, '').length >= 10)
        .map((u: { id: string; phone: string; name: string | null; totalOrders?: number }) => ({
          id: u.id, phone: u.phone, name: u.name, totalOrders: u.totalOrders ?? 0,
        }))
      setRecipients(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const { authed, checking, login } = useAdminAuth(loadRecipients)

  // Restore "sent" progress for this session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SENT_KEY)
      if (raw) setSent(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function persistSent(next: Record<string, boolean>) {
    setSent(next)
    try { localStorage.setItem(SENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  async function handleLogin(pw: string) {
    setLogging(true); setLoginErr('')
    const err = await login(pw)
    if (err) setLoginErr(err)
    setLogging(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadErr('Please choose an image file'); return }
    setUploading(true); setUploadErr('')
    try {
      const compressed = await compressImage(file, 1600, 0.85)
      const form = new FormData()
      form.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'))
      const res = await fetch('/api/admin/broadcast-image', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setImageUrl(data.url)
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const targets = useMemo(
    () => audience === 'customers' ? recipients.filter(r => r.totalOrders > 0) : recipients,
    [recipients, audience]
  )

  const sentCount = useMemo(() => targets.filter(r => sent[r.id]).length, [targets, sent])
  const nextUnsent = useMemo(() => targets.find(r => !sent[r.id]) ?? null, [targets, sent])

  function markSent(id: string) {
    persistSent({ ...sent, [id]: true })
  }

  function openAndMark(r: Recipient) {
    window.open(waLink(r.phone, buildMessage(message, imageUrl, r)), '_blank', 'noopener,noreferrer')
    markSent(r.id)
  }

  function resetProgress() {
    persistSent({})
  }

  const canSend = message.trim().length > 0

  if (checking) return <AdminChecking />
  if (!authed)  return <AdminLoginForm onLogin={handleLogin} error={loginErr} loading={logging} />

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)', fontFamily: 'system-ui', maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 }}>
          📣 Add Broadcast
        </h1>
        <p style={{ fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 }}>
          Write a message, attach an image, and send it to your customers on WhatsApp — one tap each.
        </p>
      </div>

      {/* Compose card */}
      <div style={S.card}>
        <label style={S.label}>Message</label>
        <textarea
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={"Hi {name}! 🍗 Fresh chicken specials this week at B'LURU Fresh. Order now and get free delivery!"}
          style={S.textarea}
        />
        <p style={S.hint}>
          Tip: type <code style={S.code}>{'{name}'}</code> anywhere and it becomes each customer’s first name.
        </p>

        {/* Image upload */}
        <label style={{ ...S.label, marginTop: 16 }}>Image (optional)</label>
        {imageUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Broadcast" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }} />
            <button onClick={() => setImageUrl('')} style={S.removeBtn}>Remove</button>
          </div>
        ) : (
          <label style={{ ...S.uploadBox, opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
            {uploading ? 'Uploading…' : '＋ Choose image (auto-compressed)'}
          </label>
        )}
        {uploadErr && <p style={{ ...S.hint, color: '#dc2626' }}>{uploadErr}</p>}
        {imageUrl && (
          <p style={S.hint}>
            WhatsApp can’t auto-attach a file from a link, so the image is added to the message as a link — it shows as a preview thumbnail. To send it as a real photo, paste the saved image into the chat yourself.
          </p>
        )}
      </div>

      {/* Audience + progress */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={S.label}>Send to</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {([['all', 'Everyone'], ['customers', 'Only past customers']] as const).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setAudience(val)}
                  style={{
                    ...S.pill,
                    background: audience === val ? '#d97706' : '#f3f4f6',
                    color:      audience === val ? '#fff'    : '#374151',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={S.label}>Progress</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', margin: '4px 0 0' }}>
              {sentCount}<span style={{ color: '#9ca3af', fontWeight: 600 }}> / {targets.length}</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {targets.length > 0 && (
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ height: '100%', width: `${(sentCount / targets.length) * 100}%`, background: '#16a34a', transition: 'width 0.3s' }} />
          </div>
        )}

        {/* Big "open next" button */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => nextUnsent && openAndMark(nextUnsent)}
            disabled={!canSend || !nextUnsent}
            style={{
              ...S.primaryBtn,
              background: (!canSend || !nextUnsent) ? '#e5e7eb' : '#16a34a',
              color:      (!canSend || !nextUnsent) ? '#9ca3af' : '#fff',
              cursor:     (!canSend || !nextUnsent) ? 'not-allowed' : 'pointer',
            }}
          >
            {!canSend
              ? 'Write a message first'
              : !nextUnsent
                ? '✓ All sent'
                : `💬 Send to next — ${nextUnsent.name?.split(' ')[0] || formatPhone(nextUnsent.phone)}`}
          </button>
          {sentCount > 0 && (
            <button onClick={resetProgress} style={S.ghostBtn}>↺ Reset progress</button>
          )}
        </div>
        <p style={{ ...S.hint, marginTop: 10 }}>
          Each tap opens WhatsApp with the message pre-filled — just press send, then come back and tap again for the next person. Sending hundreds of identical messages very fast can get your number flagged by WhatsApp, so pace yourself.
        </p>
      </div>

      {/* Recipient list */}
      <div style={S.card}>
        <label style={S.label}>{loading ? 'Loading…' : `${targets.length} recipients`}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, maxHeight: 460, overflowY: 'auto' }}>
          {targets.map(r => (
            <div
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.6rem 0.75rem', borderRadius: 10,
                border: '1px solid #f3f4f6',
                background: sent[r.id] ? '#f0fdf4' : '#fff',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1109', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name || 'Unknown'}
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9ca3af', margin: '1px 0 0' }}>
                  {formatPhone(r.phone)}
                </p>
              </div>
              {sent[r.id] && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>✓ Sent</span>}
              <button
                onClick={() => openAndMark(r)}
                disabled={!canSend}
                style={{
                  ...S.sendBtn,
                  background: !canSend ? '#f3f4f6' : sent[r.id] ? '#dcfce7' : '#16a34a',
                  color:      !canSend ? '#9ca3af' : sent[r.id] ? '#15803d' : '#fff',
                  cursor:     !canSend ? 'not-allowed' : 'pointer',
                }}
              >
                {sent[r.id] ? 'Send again' : '💬 Send'}
              </button>
            </div>
          ))}
          {!loading && targets.length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem' }}>
              No recipients found.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
    padding: '1.125rem 1.25rem', marginBottom: '1.125rem',
  },
  label: {
    fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
  },
  textarea: {
    width: '100%', resize: 'vertical', marginTop: 8,
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '0.75rem 0.875rem', fontSize: '0.9375rem', lineHeight: 1.5,
    fontFamily: 'system-ui', color: '#1a1109', outline: 'none', boxSizing: 'border-box',
  },
  hint: { fontSize: '0.75rem', color: '#9ca3af', margin: '8px 0 0', lineHeight: 1.5 },
  code: { background: '#f3f4f6', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', color: '#d97706' },
  uploadBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 6, padding: '0.75rem 1.25rem', borderRadius: 10,
    border: '1.5px dashed #d1d5db', color: '#6b5744', fontSize: '0.875rem',
    fontWeight: 600, cursor: 'pointer', background: '#fafafa',
  },
  removeBtn: {
    background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8,
    padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
  },
  pill: {
    border: 'none', borderRadius: 20, padding: '0.4rem 0.875rem',
    fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui',
  },
  primaryBtn: {
    flex: '1 1 240px', border: 'none', borderRadius: 12,
    padding: '0.75rem 1rem', fontSize: '0.9375rem', fontWeight: 700,
    fontFamily: 'system-ui',
  },
  ghostBtn: {
    background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 12,
    padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600,
    color: '#6b5744', cursor: 'pointer', fontFamily: 'system-ui',
  },
  sendBtn: {
    border: 'none', borderRadius: 20, padding: '0.4rem 0.875rem',
    fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'system-ui', flexShrink: 0,
  },
}
