'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'

type Settings = {
  cod_enabled:      boolean
  cashfree_enabled: boolean
  store_open:       boolean
  min_order_amount: number
  delivery_fee:     number
  delivery_hours:   string
  announcement:     string
  banner_images:    string[]
}

const DEFAULTS: Settings = {
  cod_enabled:      true,
  cashfree_enabled: true,
  store_open:       true,
  min_order_amount: 0,
  delivery_fee:     0,
  delivery_hours:   '8am – 8pm',
  announcement:     '',
  banner_images:    [],
}

export default function AdminSettingsPage() {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [logging,  setLogging]  = useState(false)
  const [loginErr, setLoginErr] = useState('')

  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [saved,    setSaved]    = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/ping').then(r => {
      if (r.ok) { setAuthed(true); loadSettings() }
    }).catch(() => {}).finally(() => setChecking(false))
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings({ ...DEFAULTS, ...data })
    } catch {}
    finally { setLoading(false) }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginErr('Incorrect password'); return }
      setAuthed(true); loadSettings()
    } catch { setLoginErr('Network error') }
    finally { setLogging(false) }
  }

  async function saveSetting(key: keyof Settings, value: unknown) {
    setSaving(key)
    try {
      await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      setSettings(prev => ({ ...prev, [key]: value }))
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } finally { setSaving(null) }
  }

  if (checking) return null
  if (!authed) return (
    <div style={S.loginWrap}>
      <div style={S.loginBox}>
        <h1 style={S.loginTitle}>Admin Sign In</h1>
        <form onSubmit={login} style={S.form}>
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} style={S.input} autoFocus />
          {loginErr && <p style={S.err}>{loginErr}</p>}
          <button type="submit" style={S.loginBtn} disabled={logging}>
            {logging ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Order Variables</h1>
          <p style={S.subtitle}>{loading ? '⏳ Loading…' : 'Live settings — changes apply instantly to the storefront'}</p>
        </div>
        <button onClick={loadSettings} style={S.refreshBtn}>↻ Refresh</button>
      </div>

      <div style={S.sections}>

        {/* ── Payments ─────────────────────────────── */}
        <Section title="💳 Payments" subtitle="Control which payment methods customers can use">
          <ToggleRow
            label="Cash on Delivery (COD)"
            description="Allow customers to pay cash when order is delivered"
            value={settings.cod_enabled}
            saving={saving === 'cod_enabled'}
            saved={saved === 'cod_enabled'}
            onChange={v => saveSetting('cod_enabled', v)}
          />
          <ToggleRow
            label="Cashfree Online Payment"
            description="Allow customers to pay online via UPI / cards / net banking"
            value={settings.cashfree_enabled}
            saving={saving === 'cashfree_enabled'}
            saved={saved === 'cashfree_enabled'}
            onChange={v => saveSetting('cashfree_enabled', v)}
          />
        </Section>

        {/* ── Store ────────────────────────────────── */}
        <Section title="🏪 Store" subtitle="Control store availability and delivery settings">
          <ToggleRow
            label="Store Open"
            description="When off, customers see a 'store closed' banner and cannot add to cart"
            value={settings.store_open}
            saving={saving === 'store_open'}
            saved={saved === 'store_open'}
            onChange={v => saveSetting('store_open', v)}
          />
          <NumberRow
            label="Minimum Order Amount (₹)"
            description="Orders below this value cannot be placed (0 = no minimum)"
            value={settings.min_order_amount}
            saving={saving === 'min_order_amount'}
            saved={saved === 'min_order_amount'}
            onSave={v => saveSetting('min_order_amount', v)}
          />
          <NumberRow
            label="Delivery Fee (₹)"
            description="Added to every order total (0 = free delivery)"
            value={settings.delivery_fee}
            saving={saving === 'delivery_fee'}
            saved={saved === 'delivery_fee'}
            onSave={v => saveSetting('delivery_fee', v)}
          />
          <TextRow
            label="Delivery Hours"
            description="Shown to customers on the shop page"
            placeholder="e.g. 8am – 8pm"
            value={settings.delivery_hours}
            saving={saving === 'delivery_hours'}
            saved={saved === 'delivery_hours'}
            onSave={v => saveSetting('delivery_hours', v)}
          />
        </Section>

        {/* ── Announcement ─────────────────────────── */}
        <Section title="📢 Announcement Banner" subtitle="Optional message shown at the top of the shop. Leave blank to hide.">
          <TextRow
            label="Message"
            description='e.g. "Closed on Sundays" or "Holiday special: 10% off boneless!"'
            placeholder="Leave blank to hide banner"
            value={settings.announcement}
            saving={saving === 'announcement'}
            saved={saved === 'announcement'}
            onSave={v => saveSetting('announcement', v)}
            multiline
          />
        </Section>

        {/* ── Banner Images ─────────────────────────── */}
        <Section
          title="🖼️ Shop Banner Images"
          subtitle="Images that cycle every 3 seconds in the shop. Recommended: 800 × 350 px JPEG, max 2 MB each."
        >
          <BannerImagesRow
            images={settings.banner_images ?? []}
            onChange={imgs => setSettings(prev => ({ ...prev, banner_images: imgs }))}
          />
        </Section>

        {/* ── Danger Zone ──────────────────────────── */}
        <ResetVisitorsSection />
        <ResetDataSection />

      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────── */

function Section({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div style={S.section}>
      <div style={S.sectionHead}>
        <p style={S.sectionTitle}>{title}</p>
        <p style={S.sectionSub}>{subtitle}</p>
      </div>
      <div style={S.sectionBody}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      role="switch" aria-checked={value}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: value ? '#d97706' : '#d1d5db',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: value ? 25 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

function ToggleRow({ label, description, value, saving, saved, onChange }: {
  label: string; description: string
  value: boolean; saving: boolean; saved: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={S.row}>
      <div style={{ flex: 1 }}>
        <p style={S.rowLabel}>{label}</p>
        <p style={S.rowDesc}>{description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {saving && <span style={S.savingText}>Saving…</span>}
        {saved  && <span style={S.savedText}>✓ Saved</span>}
        <Toggle value={value} onChange={onChange} />
        <span style={{ ...S.statusText, color: value ? '#16a34a' : '#6b7280' }}>
          {value ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  )
}

function NumberRow({ label, description, value, saving, saved, onSave }: {
  label: string; description: string
  value: number; saving: boolean; saved: boolean
  onSave: (v: number) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div style={S.row}>
      <div style={{ flex: 1 }}>
        <p style={S.rowLabel}>{label}</p>
        <p style={S.rowDesc}>{description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#6b5744', fontWeight: 600 }}>₹</span>
        <input
          type="number" min={0} value={draft}
          onChange={e => setDraft(Number(e.target.value))}
          style={{ ...S.numInput, width: 90 }}
        />
        <button
          onClick={() => onSave(draft)} disabled={saving}
          style={{ ...S.saveBtn, ...(saved ? S.saveBtnOk : {}) }}
        >
          {saving ? '…' : saved ? '✓' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function TextRow({ label, description, placeholder, value, saving, saved, onSave, multiline }: {
  label: string; description: string; placeholder: string
  value: string; saving: boolean; saved: boolean
  onSave: (v: string) => void; multiline?: boolean
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div style={{ ...S.row, alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={S.rowLabel}>{label}</p>
        <p style={S.rowDesc}>{description}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
        {multiline ? (
          <textarea
            rows={2} placeholder={placeholder} value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{ ...S.textInput, flex: 1, resize: 'vertical' }}
          />
        ) : (
          <input
            type="text" placeholder={placeholder} value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{ ...S.textInput, flex: 1 }}
          />
        )}
        <button
          onClick={() => onSave(draft)} disabled={saving}
          style={{ ...S.saveBtn, ...(saved ? S.saveBtnOk : {}), alignSelf: 'flex-start' }}
        >
          {saving ? '…' : saved ? '✓' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function BannerImagesRow({
  images,
  onChange,
}: {
  images: string[]
  onChange: (imgs: string[]) => void
}) {
  const fileRef              = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [deleting,  setDeleting]  = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    for (const file of Array.from(files)) {
      // Client-side validation
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Only JPEG, PNG or WebP allowed'); break
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Max file size is 10 MB'); break
      }

      try {
        // Single step: send file to our server — it uploads to Supabase server-to-server (no CORS)
        const form = new FormData()
        form.append('file', file)
        const res  = await fetch('/api/admin/banner-images', { method: 'POST', body: form })
        const data: { url?: string; error?: string } = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? `Upload failed (${res.status})`)
          break
        }

        onChange([...images, data.url!])
        images = [...images, data.url!]
      } catch (e) {
        setError(`Network error: ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(url: string) {
    setDeleting(url)
    setError('')
    try {
      const res = await fetch('/api/admin/banner-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Delete failed'); return }
      onChange(images.filter(u => u !== url))
    } catch { setError('Network error') }
    finally { setDeleting(null) }
  }

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Size hint */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
        padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#78350f',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>📐</span>
        <div>
          <strong>Recommended size: 800 × 350 px</strong> — landscape JPEG or PNG, up to 10 MB each.<br />
          This gives a crisp 16:7 banner on all phones. Upload multiple images to enable the auto-cycling slideshow.
        </div>
      </div>

      {/* Supabase bucket setup note */}
      <div style={{
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
        padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#0c4a6e',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>☁️</span>
        <div>
          <strong>First-time setup:</strong> In your Supabase Dashboard → Storage, create a bucket named{' '}
          <code style={{ background: '#e0f2fe', padding: '1px 5px', borderRadius: 4 }}>banners</code>{' '}
          and set it to <strong>Public</strong>. Only do this once.
        </div>
      </div>

      {/* Upload button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            background: uploading ? '#d1d5db' : '#d97706',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '0.6rem 1.25rem', fontWeight: 700,
            fontSize: '0.875rem', cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {uploading ? '⏳ Uploading…' : '+ Upload Images'}
        </button>
        <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
          {images.length === 0
            ? 'No images yet — upload to replace the default gradient banner'
            : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded`}
        </span>
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: 0 }}>⚠ {error}</p>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {images.map((url, i) => (
            <div
              key={url}
              style={{
                position: 'relative', borderRadius: 12, overflow: 'hidden',
                border: '1.5px solid #e5e7eb', aspectRatio: '16/7', background: '#f3f4f6',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url} alt={`Banner ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Order badge */}
              <div style={{
                position: 'absolute', top: 6, left: 6,
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              }}>
                #{i + 1}
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(url)}
                disabled={deleting === url}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: deleting === url ? '#9ca3af' : '#ef4444',
                  color: '#fff', border: 'none', borderRadius: 99,
                  width: 26, height: 26, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, lineHeight: 1,
                }}
              >
                {deleting === url ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResetVisitorsSection() {
  const [state,  setState]  = useState<'idle' | 'confirming' | 'running' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function runReset() {
    setState('running')
    try {
      const res  = await fetch('/api/admin/reset-visitors', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? `Error ${res.status}`); setState('error'); return }
      setState('done')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }

  return (
    <div style={{ border: '2px solid #bfdbfe', borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ background: '#eff6ff', padding: '1.125rem 1.5rem', borderBottom: '1px solid #bfdbfe' }}>
        <p style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9375rem', margin: 0 }}>📊 Reset Visitor Counts</p>
        <p style={{ fontSize: '0.8125rem', color: '#1e40af', margin: '3px 0 0' }}>
          Resets total visits and unique device counts to zero. Does not affect orders or customer data.
        </p>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {state === 'idle' && (
          <button
            onClick={() => setState('confirming')}
            style={{ background: '#dbeafe', color: '#1d4ed8', border: '2px solid #bfdbfe', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Reset Visitor Counts…
          </button>
        )}
        {state === 'confirming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem' }}>
              Reset total visits and unique devices to 0?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={runReset}
                style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Yes, reset
              </button>
              <button
                onClick={() => setState('idle')}
                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {state === 'running' && <p style={{ color: '#1d4ed8', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>⏳ Resetting…</p>}
        {state === 'done'    && <p style={{ color: '#15803d', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>✅ Visitor counts reset to zero.</p>}
        {state === 'error'   && <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>❌ {errMsg}</p>}
        {state === 'done' && (
          <button onClick={() => setState('idle')} style={{ marginTop: 10, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '0.45rem 1rem', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}>
            Done
          </button>
        )}
      </div>
    </div>
  )
}

function ResetDataSection() {
  const [state,   setState]   = useState<'idle' | 'confirming' | 'running' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<Record<string, string>>({})
  const [errMsg,  setErrMsg]  = useState('')

  async function runReset() {
    setState('running')
    try {
      const res  = await fetch('/api/admin/reset-data', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? `Error ${res.status}`); setState('error'); return }
      setResults(data.results ?? {})
      setState('done')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }

  return (
    <div style={{
      border: '2px solid #fca5a5', borderRadius: 14, overflow: 'hidden',
      marginTop: 8,
    }}>
      <div style={{ background: '#fef2f2', padding: '1.125rem 1.5rem', borderBottom: '1px solid #fca5a5' }}>
        <p style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.9375rem', margin: 0 }}>🗑️ Clear All Test Data</p>
        <p style={{ fontSize: '0.8125rem', color: '#b91c1c', margin: '3px 0 0' }}>
          Permanently deletes all orders, all customer accounts, and resets coupon usage. Use before launch.
        </p>
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {state === 'idle' && (
          <button
            onClick={() => setState('confirming')}
            style={{ background: '#fee2e2', color: '#991b1b', border: '2px solid #fca5a5', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Clear All Test Data…
          </button>
        )}

        {state === 'confirming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>
              ⚠️ This will permanently delete ALL orders, ALL users and ALL analytics. Are you sure?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={runReset}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setState('idle')}
                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'running' && (
          <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>⏳ Deleting data…</p>
        )}

        {state === 'done' && (
          <div>
            <p style={{ color: '#15803d', fontWeight: 700, fontSize: '0.875rem', margin: '0 0 8px' }}>✅ Done! Data cleared:</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8125rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(results).map(([k, v]) => (
                <li key={k}><strong>{k}</strong>: {v}</li>
              ))}
            </ul>
          </div>
        )}

        {state === 'error' && (
          <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>❌ {errMsg}</p>
        )}
      </div>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  loginWrap:    { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 340, textAlign: 'center' },
  loginTitle:   { fontWeight: 700, color: '#1a1109', marginBottom: '1.5rem' },
  form:         { display: 'flex', flexDirection: 'column', gap: 12 },
  input:        { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9375rem', outline: 'none' },
  err:          { color: '#dc2626', fontSize: '0.8125rem', margin: 0 },
  loginBtn:     { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' },

  wrap:         { padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)', maxWidth: 860, margin: '0 auto' },
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 },
  title:        { fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:     { fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 },
  refreshBtn:   { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' },

  sections:     { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  section:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' },
  sectionHead:  { padding: '1.125rem 1.5rem', borderBottom: '1px solid #f3f4f6', background: '#fafafa' },
  sectionTitle: { fontWeight: 700, color: '#1a1109', fontSize: '0.9375rem', margin: 0 },
  sectionSub:   { fontSize: '0.8125rem', color: '#6b5744', margin: '3px 0 0' },
  sectionBody:  { display: 'flex', flexDirection: 'column' },

  row:          { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '1rem 1.5rem', borderBottom: '1px solid #f9fafb' },
  rowLabel:     { fontWeight: 600, color: '#1a1109', fontSize: '0.875rem', margin: 0 },
  rowDesc:      { fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0' },
  statusText:   { fontSize: '0.75rem', fontWeight: 700, minWidth: 28 },
  savingText:   { fontSize: '0.75rem', color: '#9ca3af' },
  savedText:    { fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 },

  numInput:     { border: '1.5px solid #d97706', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.9375rem', fontWeight: 600, outline: 'none', color: '#1a1109' },
  textInput:    { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', color: '#1a1109', fontFamily: 'system-ui' },
  saveBtn:      { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 0.85rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap' as const },
  saveBtnOk:    { background: '#16a34a' },
}
