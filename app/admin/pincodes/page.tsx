'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'

type Pincode = { id: string; pincode: string; area_name: string; is_active: boolean }

export default function AdminPincodesPage() {
  const [authed,    setAuthed]    = useState(false)
  const [checking,  setChecking]  = useState(true)
  const [password,  setPassword]  = useState('')
  const [logging,   setLogging]   = useState(false)
  const [loginErr,  setLoginErr]  = useState('')

  const [pincodes,  setPincodes]  = useState<Pincode[]>([])
  const [loading,   setLoading]   = useState(false)
  const [newPin,    setNewPin]    = useState('')
  const [newArea,   setNewArea]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [addErr,    setAddErr]    = useState('')

  useEffect(() => {
    fetch('/api/admin/ping').then(r => {
      if (r.ok) { setAuthed(true); load() }
    }).catch(() => {}).finally(() => setChecking(false))
  }, [])

  async function load() {
    setLoading(true)
    try {
      // Use service-role fetch via admin ping — call supabase REST directly for full rows
      const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      // Fetch via our own API with admin cookie
      const res = await fetch('/api/pincodes/admin')
      const data = await res.json()
      setPincodes(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginErr('Incorrect password'); return }
      setAuthed(true); load()
    } catch { setLoginErr('Network error') }
    finally { setLogging(false) }
  }

  async function addPincode() {
    const clean = newPin.replace(/\D/g, '').slice(0, 6)
    if (clean.length !== 6) { setAddErr('Enter a valid 6-digit pincode'); return }
    setAdding(true); setAddErr('')
    try {
      const res = await fetch('/api/pincodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: clean, area_name: newArea.trim() }),
      })
      if (!res.ok) { const e = await res.json(); setAddErr(e.error ?? 'Failed'); return }
      setNewPin(''); setNewArea(''); load()
    } catch { setAddErr('Network error') }
    finally { setAdding(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/pincodes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setPincodes(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  async function deletePincode(id: string) {
    if (!confirm('Delete this pincode?')) return
    await fetch(`/api/pincodes?id=${id}`, { method: 'DELETE' })
    setPincodes(prev => prev.filter(p => p.id !== id))
  }

  if (checking) return null
  if (!authed) {
    return (
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
  }

  const active   = pincodes.filter(p => p.is_active)
  const inactive = pincodes.filter(p => !p.is_active)

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Delivery Pincodes</h1>
          <p style={S.subtitle}>
            {loading ? '⏳ Loading…' : `${active.length} active · ${pincodes.length} total`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={S.refreshBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* Add new pincode */}
      <div style={S.addBox}>
        <h2 style={S.addTitle}>Add Pincode</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 140px' }}>
            <label style={S.label}>Pincode</label>
            <input
              type="tel" inputMode="numeric" maxLength={6} placeholder="560064"
              value={newPin} onChange={e => { setNewPin(e.target.value.replace(/\D/g,'')); setAddErr('') }}
              style={S.input}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={S.label}>Area name (optional)</label>
            <input
              type="text" placeholder="e.g. Yelahanka New Town"
              value={newArea} onChange={e => setNewArea(e.target.value)}
              style={S.input}
              onKeyDown={e => e.key === 'Enter' && addPincode()}
            />
          </div>
          <button onClick={addPincode} disabled={adding} style={S.addBtn}>
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {addErr && <p style={S.err}>{addErr}</p>}
      </div>

      {/* Active pincodes */}
      {active.length > 0 && (
        <div style={S.section}>
          <h2 style={S.sectionTitle}>✅ Active — delivers to these pincodes</h2>
          <div style={S.grid}>
            {active.map(p => (
              <PincodeCard key={p.id} p={p} onToggle={toggleActive} onDelete={deletePincode} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive pincodes */}
      {inactive.length > 0 && (
        <div style={S.section}>
          <h2 style={S.sectionTitle}>⏸ Paused — not currently delivering</h2>
          <div style={S.grid}>
            {inactive.map(p => (
              <PincodeCard key={p.id} p={p} onToggle={toggleActive} onDelete={deletePincode} />
            ))}
          </div>
        </div>
      )}

      {!loading && pincodes.length === 0 && (
        <div style={S.empty}>
          <p style={{ fontSize: '2rem', margin: 0 }}>📍</p>
          <p style={{ color: '#6b5744', margin: 0 }}>No pincodes yet. Add one above to enable ordering.</p>
        </div>
      )}

      {/* SQL hint — only shown when table is empty/missing */}
      {!loading && pincodes.length === 0 && (
        <div style={S.hint}>
          <p style={{ fontWeight: 600, color: '#92400e', marginBottom: 8, fontSize: '0.875rem' }}>
            No pincodes found. Run this SQL in Supabase to set up the table:
          </p>
          <pre style={S.sql}>{SQL}</pre>
        </div>
      )}
    </div>
  )
}

function PincodeCard({ p, onToggle, onDelete }: {
  p: Pincode
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ ...S.card, opacity: p.is_active ? 1 : 0.6 }}>
      <div>
        <p style={{ fontWeight: 700, color: '#1a1109', fontSize: '1.125rem', margin: 0, fontFamily: 'monospace' }}>
          {p.pincode}
        </p>
        <p style={{ color: '#6b5744', fontSize: '0.8125rem', margin: '2px 0 0' }}>
          {p.area_name || '—'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button
          onClick={() => onToggle(p.id, p.is_active)}
          style={{ ...S.toggleBtn, background: p.is_active ? '#fef3c7' : '#dcfce7', color: p.is_active ? '#92400e' : '#166534', flex: 1 }}
        >
          {p.is_active ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={() => onDelete(p.id)}
          style={{ ...S.toggleBtn, background: '#fee2e2', color: '#dc2626' }}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

const SQL = `CREATE TABLE IF NOT EXISTS pincodes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode    TEXT NOT NULL UNIQUE,
  area_name  TEXT NOT NULL DEFAULT '',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pincodes DISABLE ROW LEVEL SECURITY;

INSERT INTO pincodes (pincode, area_name) VALUES
  ('560064', 'Yelahanka'),
  ('560063', 'Yelahanka Old Town'),
  ('560065', 'HBR Layout')
ON CONFLICT (pincode) DO NOTHING;`

const S: Record<string, React.CSSProperties> = {
  loginWrap:    { minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox:     { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 340, textAlign: 'center' },
  loginTitle:   { fontWeight: 700, color: '#1a1109', marginBottom: '1.5rem' },
  form:         { display: 'flex', flexDirection: 'column', gap: 12 },
  input:        { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.6rem 0.875rem', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' },
  err:          { color: '#dc2626', fontSize: '0.8125rem', margin: '4px 0 0' },
  loginBtn:     { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', width: '100%' },

  wrap:         { padding: '2rem clamp(1rem, 4vw, 2.5rem)', maxWidth: 900 },
  header:       { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 },
  title:        { fontSize: '1.5rem', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:     { fontSize: '0.875rem', color: '#6b5744', marginTop: 4 },
  refreshBtn:   { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#6b5744' },

  addBox:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' },
  addTitle:     { fontWeight: 700, color: '#1a1109', margin: '0 0 1rem', fontSize: '0.9375rem' },
  label:        { fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 },
  addBtn:       { background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', alignSelf: 'flex-end', whiteSpace: 'nowrap' },

  section:      { marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' },
  card:         { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem' },
  toggleBtn:    { border: 'none', borderRadius: 7, padding: '0.4rem 0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' },

  empty:        { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: 12 },
  hint:         { marginTop: '2rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1.25rem' },
  sql:          { background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: '0.875rem', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.5rem', whiteSpace: 'pre', lineHeight: 1.6 },
}
