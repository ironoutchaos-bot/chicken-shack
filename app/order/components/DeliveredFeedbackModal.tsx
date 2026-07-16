'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { type OrderRow } from '@/lib/supabase-browser'

const LABELS = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent 🤩']

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          style={{
            background: 'none', border: 'none', padding: '2px 2px',
            cursor: 'pointer', fontSize: '2.25rem', lineHeight: 1,
            filter: n <= active ? 'none' : 'grayscale(1) opacity(0.3)',
            transform: n <= active ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.12s, filter 0.12s',
          }}
          aria-label={`${n} star`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

export default function DeliveredFeedbackModal({
  order,
  onClose,
}: {
  order: OrderRow
  onClose: () => void
}) {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function submit() {
    if (!rating) { setError('Please tap a star to rate'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment }),
      })
      if (!res.ok) throw new Error('Failed')
      setDone(true)
      setTimeout(onClose, 1600)
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(22,20,15,.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'bfFeedbackFade .2s ease',
      }}
    >
      <style>{`
        @keyframes bfFeedbackFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bfFeedbackPop { from { opacity: 0; transform: translateY(16px) scale(.96) } to { opacity: 1; transform: none } }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24,
          overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)',
          animation: 'bfFeedbackPop .28s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {done ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 12 }}>🙏</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#16140f', fontFamily: "'Archivo Black', sans-serif" }}>
              Thank you!
            </p>
            <p style={{ fontSize: 13, color: 'rgba(22,20,15,.5)', marginTop: 6 }}>
              {LABELS[rating]} · Your feedback means a lot 💚
            </p>
          </div>
        ) : (
          <>
            {/* Celebration header */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg,#065F46 0%,#059669 55%,#34D399 100%)',
              padding: '24px 24px 20px', textAlign: 'center',
            }}>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
              <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 8 }}>🎉</div>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", lineHeight: 1.1 }}>
                Order Delivered!
              </p>
              <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 12.5, marginTop: 5 }}>
                Your feedback makes the product better every day.
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#92400E', textAlign: 'center', marginBottom: 12 }}>
                RATE YOUR ORDER
              </p>

              <Stars value={rating} onChange={setRating} />

              {rating > 0 && (
                <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#B45309', marginTop: 10 }}>
                  {LABELS[rating]}
                </p>
              )}

              <textarea
                rows={2}
                placeholder="Tell us more (optional)…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={500}
                style={{
                  width: '100%', resize: 'none', marginTop: 16,
                  border: '1.5px solid rgba(22,20,15,.12)', borderRadius: 14,
                  padding: '11px 13px', fontSize: 13, fontFamily: 'system-ui',
                  color: '#374151', background: '#fafafa', outline: 'none', boxSizing: 'border-box',
                }}
              />

              {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8, textAlign: 'center' }}>{error}</p>}

              <button
                onClick={submit}
                disabled={saving || !rating}
                style={{
                  width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 16, border: 'none',
                  background: rating ? 'linear-gradient(135deg,#16a34a,#059669)' : 'rgba(22,20,15,.12)',
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: rating ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: rating ? '0 4px 16px rgba(5,150,105,.35)' : 'none',
                  transition: 'background .2s',
                }}
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Submit Feedback'}
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%', marginTop: 8, padding: '9px 0', border: 'none',
                  background: 'none', color: 'rgba(22,20,15,.4)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
