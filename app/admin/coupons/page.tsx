'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Coupon } from '@/app/api/coupons/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = { id: string; name: string; price_per_kg: number }

type FormState = {
  code:               string
  enabled:            boolean
  discount_type:      'percent' | 'fixed'
  discount_value:     number
  max_uses_per_phone: number
  applies_to:         'all' | 'specific'
  product_ids:        string[]
}

const EMPTY_FORM: FormState = {
  code:               '',
  enabled:            true,
  discount_type:      'percent',
  discount_value:     10,
  max_uses_per_phone: 0,
  applies_to:         'all',
  product_ids:        [],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genCode(): string {
  const words = ['CHICKEN','FRESH','JUICY','CRISPY','SPICY','YUMMY','TASTY']
  const nums  = Math.floor(10 + Math.random() * 90)
  return words[Math.floor(Math.random() * words.length)] + nums
}

function discountLabel(c: Coupon): string {
  return c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${c.discount_value} off`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [coupons,   setCoupons]   = useState<Coupon[]>([])
  const [products,  setProducts]  = useState<Product[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Form state
  const [showForm,  setShowForm]  = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  // ── Load data ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/coupons'),
        fetch('/api/products'),
      ])
      if (cRes.ok) setCoupons(await cRes.json())
      if (pRes.ok) {
        const raw = await pRes.json()
        setProducts(Array.isArray(raw) ? raw : [])
      }
    } catch { setError('Failed to load data') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Toast helper ──────────────────────────────────────────────────────────

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  // ── Form open/close ───────────────────────────────────────────────────────

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(c: Coupon) {
    setEditId(c.id)
    setForm({
      code:               c.code,
      enabled:            c.enabled,
      discount_type:      c.discount_type,
      discount_value:     c.discount_value,
      max_uses_per_phone: c.max_uses_per_phone,
      applies_to:         c.applies_to,
      product_ids:        c.product_ids ?? [],
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  // ── Save (create / update) ────────────────────────────────────────────────

  async function save() {
    setFormError('')
    const code = form.code.trim().toUpperCase()
    if (!code) { setFormError('Coupon code is required'); return }
    if (form.discount_value <= 0) { setFormError('Discount value must be greater than 0'); return }
    if (form.discount_type === 'percent' && form.discount_value > 100) {
      setFormError('Percentage discount cannot exceed 100%')
      return
    }
    if (form.applies_to === 'specific' && form.product_ids.length === 0) {
      setFormError('Please select at least one product')
      return
    }

    setSaving(true)
    try {
      const method = editId ? 'PATCH' : 'POST'
      const payload = editId
        ? { id: editId, ...form, code }
        : { ...form, code }

      const res = await fetch('/api/coupons', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? `Error ${res.status}`)
        setSaving(false)
        return
      }
      await load()
      closeForm()
      flash(editId ? 'Coupon updated!' : 'Coupon created!')
    } catch {
      setFormError('Network error — please try again')
    }
    setSaving(false)
  }

  // ── Quick toggle enable ───────────────────────────────────────────────────

  async function toggleEnabled(c: Coupon) {
    const res = await fetch('/api/coupons', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: c.id, enabled: !c.enabled }),
    })
    if (res.ok) {
      setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, enabled: !x.enabled } : x))
      flash(c.enabled ? 'Coupon disabled' : 'Coupon enabled!')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteCoupon(id: string) {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setDeleting(id)
    const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCoupons(prev => prev.filter(c => c.id !== id))
      flash('Coupon deleted')
    } else {
      setError('Failed to delete coupon')
    }
    setDeleting(null)
  }

  // ── Product picker ────────────────────────────────────────────────────────

  function toggleProduct(id: string) {
    setForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter(p => p !== id)
        : [...f.product_ids, id],
    }))
  }

  // ─── Styles (inline, no Tailwind dependency) ──────────────────────────────

  const S = {
    page:    { maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui' } as React.CSSProperties,
    h1:      { fontSize: '1.5rem', fontWeight: 800, color: '#1a1109', margin: 0 } as React.CSSProperties,
    hRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 } as React.CSSProperties,
    btn:     (variant: 'primary' | 'ghost' | 'danger') => ({
      padding: '0.5rem 1rem',
      borderRadius: 10,
      border: 'none',
      fontWeight: 700,
      fontSize: '0.85rem',
      cursor: 'pointer',
      transition: 'opacity 0.15s',
      background: variant === 'primary' ? '#d97706'
        : variant === 'danger'  ? '#fef2f2'
        : '#f3f4f6',
      color: variant === 'primary' ? '#fff'
        : variant === 'danger'  ? '#dc2626'
        : '#374151',
    } as React.CSSProperties),
    card:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column' as const, gap: 8 } as React.CSSProperties,
    badge:   (on: boolean) => ({
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
      background: on ? '#d1fae5' : '#f3f4f6',
      color:      on ? '#065f46' : '#9ca3af',
    } as React.CSSProperties),
    input:   { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: '0.9rem', fontFamily: 'system-ui', outline: 'none', boxSizing: 'border-box' as const } as React.CSSProperties,
    label:   { fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block', marginBottom: 4 } as React.CSSProperties,
    row:     { display: 'flex', gap: 12, alignItems: 'flex-end' } as React.CSSProperties,
    overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' } as React.CSSProperties,
    modal:   { background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' } as React.CSSProperties,
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.hRow}>
        <h1 style={S.h1}>🎟️ Coupons</h1>
        <button style={S.btn('primary')} onClick={openCreate}>+ New Coupon</button>
      </div>

      {/* Toasts */}
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '0.6rem 1rem', marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Coupon list */}
      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎟️</div>
          <p style={{ fontWeight: 600 }}>No coupons yet</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Click "New Coupon" to create your first one</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {coupons.map(c => (
            <div key={c.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {/* Code + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.06em', color: '#1a1109' }}>
                    {c.code}
                  </span>
                  <span style={S.badge(c.enabled)}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.enabled ? '#10b981' : '#d1d5db', display: 'inline-block', ...(c.enabled ? { animation: 'pulse 2s infinite' } : {}) }} />
                    {c.enabled ? 'LIVE' : 'OFF'}
                  </span>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                    {discountLabel(c)}
                  </span>
                  {c.applies_to === 'specific' && (
                    <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                      {c.product_ids.length} product{c.product_ids.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {c.applies_to === 'all' && (
                    <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                      All products
                    </span>
                  )}
                  {c.max_uses_per_phone > 0 && (
                    <span style={{ background: '#f0f9ff', color: '#0c4a6e', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                      Max {c.max_uses_per_phone}× / phone
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => toggleEnabled(c)}
                    style={{ ...S.btn('ghost'), padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                  >
                    {c.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    style={{ ...S.btn('ghost'), padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    disabled={deleting === c.id}
                    style={{ ...S.btn('danger'), padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                  >
                    {deleting === c.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Details row */}
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                {c.max_uses_per_phone === 0 ? 'Unlimited uses per phone' : `Up to ${c.max_uses_per_phone} use${c.max_uses_per_phone !== 1 ? 's' : ''} per phone`}
                {' · '}
                Created {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              {/* Product names if specific */}
              {c.applies_to === 'specific' && c.product_ids.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#6366f1' }}>
                  Products: {c.product_ids.map(pid => {
                    const p = products.find(p => p.id === pid)
                    return p ? p.name : pid
                  }).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) closeForm() }}>
          <div style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1109', margin: 0 }}>
                {editId ? 'Edit Coupon' : 'New Coupon'}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#9ca3af' }}>×</button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ {formError}
              </div>
            )}

            {/* Code */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Coupon Code</label>
              <div style={S.row}>
                <input
                  style={{ ...S.input, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  placeholder="e.g. CHICKEN20"
                  value={form.code}
                  maxLength={20}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, code: genCode() }))}
                  style={{ ...S.btn('ghost'), whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  🎲 Generate
                </button>
              </div>
            </div>

            {/* Discount type + value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
              <div>
                <label style={S.label}>Discount Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['percent', 'fixed'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, discount_type: t }))}
                      style={{
                        flex: 1, padding: '0.45rem', borderRadius: 8, border: '2px solid',
                        borderColor: form.discount_type === t ? '#d97706' : '#e5e7eb',
                        background:  form.discount_type === t ? '#fef3c7' : '#fff',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        color: form.discount_type === t ? '#92400e' : '#6b7280',
                      }}
                    >
                      {t === 'percent' ? '% Off' : '₹ Off'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Discount Value</label>
                <input
                  type="number"
                  min={1}
                  max={form.discount_type === 'percent' ? 100 : 99999}
                  style={S.input}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Max uses per phone */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Max Uses Per Phone Number</label>
              <input
                type="number"
                min={0}
                style={S.input}
                value={form.max_uses_per_phone}
                onChange={e => setForm(f => ({ ...f, max_uses_per_phone: Math.max(0, Number(e.target.value)) }))}
              />
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>Set to 0 for unlimited uses</p>
            </div>

            {/* Applies to */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Applies To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'specific'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, applies_to: t, product_ids: t === 'all' ? [] : f.product_ids }))}
                    style={{
                      flex: 1, padding: '0.45rem', borderRadius: 8, border: '2px solid',
                      borderColor: form.applies_to === t ? '#6366f1' : '#e5e7eb',
                      background:  form.applies_to === t ? '#ede9fe' : '#fff',
                      fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      color: form.applies_to === t ? '#4338ca' : '#6b7280',
                    }}
                  >
                    {t === 'all' ? '🛒 All Products' : '🎯 Specific Products'}
                  </button>
                ))}
              </div>
            </div>

            {/* Product picker — shown only for specific */}
            {form.applies_to === 'specific' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={S.label}>Select Products</label>
                {products.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Loading products…</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {products.map(p => {
                      const selected = form.product_ids.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '0.55rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                            border: `2px solid ${selected ? '#6366f1' : '#e5e7eb'}`,
                            background: selected ? '#ede9fe' : '#fafafa',
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleProduct(p.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                          />
                          <span style={{ fontSize: '0.875rem', fontWeight: selected ? 700 : 500, color: selected ? '#4338ca' : '#374151' }}>
                            {p.name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {form.code && form.discount_value > 0 && (
              <div style={{ background: '#fffbeb', border: '1.5px dashed #fbbf24', borderRadius: 10, padding: '0.65rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🎟️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{form.code || '—'}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e' }}>
                    {form.discount_type === 'percent' ? `${form.discount_value}% off` : `₹${form.discount_value} off`}
                    {form.applies_to === 'specific' && form.product_ids.length > 0
                      ? ` · ${form.product_ids.length} product${form.product_ids.length !== 1 ? 's' : ''} only`
                      : ' · All products'}
                    {form.max_uses_per_phone > 0 && ` · ${form.max_uses_per_phone}× per phone`}
                  </p>
                </div>
              </div>
            )}

            {/* Enabled toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: form.enabled ? '#d97706' : '#d1d5db',
                  position: 'relative', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: form.enabled ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: form.enabled ? '#065f46' : '#6b7280' }}>
                {form.enabled ? 'Coupon is active' : 'Coupon is disabled'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeForm} style={S.btn('ghost')}>Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                style={{ ...S.btn('primary'), opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulsing animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
