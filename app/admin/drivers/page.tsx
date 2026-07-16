'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'

type Driver = {
  id: string
  name: string
  user_id: string
  phone: string | null
  is_active: boolean
  created_at: string
}

export default function AdminDriversPage() {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [logging,  setLogging]  = useState(false)
  const [loginErr, setLoginErr] = useState('')

  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // New driver form
  const [form, setForm] = useState({ name: '', user_id: '', password: '', phone: '' })
  const [formErr, setFormErr] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Edit password inline
  const [editingPwd, setEditingPwd] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState('')

  // Test driver alarm
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState('')

  const loadDrivers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drivers')
      if (!res.ok) throw new Error()
      setDrivers(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/admin/ping').then(r => {
      if (r.ok) { setAuthed(true); loadDrivers() }
    }).catch(() => {}).finally(() => setChecking(false))
  }, [loadDrivers])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true); setLoginErr('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setLoginErr('Incorrect password'); return }
      setAuthed(true); loadDrivers()
    } catch { setLoginErr('Network error') }
    finally { setLogging(false) }
  }

  async function createDriver(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    if (!form.name.trim() || !form.user_id.trim() || !form.password.trim()) {
      setFormErr('Name, User ID, and Password are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? 'Failed to create driver'); return }
      setForm({ name: '', user_id: '', password: '', phone: '' })
      setShowForm(false)
      loadDrivers()
    } catch { setFormErr('Network error') }
    finally { setSaving(false) }
  }

  async function toggleActive(driver: Driver) {
    await fetch(`/api/drivers/${driver.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !driver.is_active }),
    })
    setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, is_active: !d.is_active } : d))
  }

  async function deleteDriver(id: string) {
    if (!confirm('Delete this driver? This cannot be undone.')) return
    setDeleting(id)
    try {
      await fetch(`/api/drivers/${id}`, { method: 'DELETE' })
      setDrivers(prev => prev.filter(d => d.id !== id))
    } finally { setDeleting(null) }
  }

  async function testAlarm() {
    setTesting(true); setTestResult('')
    try {
      const res = await fetch('/api/admin/test-driver-alarm', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setTestResult(data.error ?? 'Failed to send'); return }
      if (data.total === 0) {
        setTestResult('No drivers have notifications enabled yet')
      } else if (data.sent > 0) {
        setTestResult(`✓ Delivered to ${data.sent} of ${data.total} device${data.total !== 1 ? 's' : ''}`)
      } else {
        setTestResult(`⚠ 0 delivered — all ${data.total} failed (check setup)`)
      }
    } catch {
      setTestResult('Network error')
    } finally {
      setTesting(false)
      setTimeout(() => setTestResult(''), 6000)
    }
  }

  async function resetSubscriptions() {
    if (!confirm('Clear all driver notification registrations? Each driver phone will re-register automatically the next time it opens the app. Use this to remove stale/dead devices.')) return
    setTesting(true); setTestResult('')
    try {
      const res = await fetch('/api/admin/reset-driver-subscriptions', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setTestResult(data.error ?? 'Failed'); return }
      setTestResult(`✓ Cleared ${data.cleared} old device${data.cleared !== 1 ? 's' : ''} — now reopen the app on each driver phone`)
    } catch {
      setTestResult('Network error')
    } finally {
      setTesting(false)
      setTimeout(() => setTestResult(''), 9000)
    }
  }

  async function savePassword(id: string) {
    if (!newPwd.trim()) return
    await fetch(`/api/drivers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPwd.trim() }),
    })
    setEditingPwd(null)
    setNewPwd('')
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

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Drivers</h1>
          <p style={S.subtitle}>{drivers.length} driver{drivers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {testResult && <span style={{ fontSize: '0.8125rem', color: testResult.startsWith('✓') ? '#16a34a' : '#d97706', fontWeight: 600 }}>{testResult}</span>}
          <button onClick={resetSubscriptions} disabled={testing} style={S.resetBtn}>
            ♻ Reset notifications
          </button>
          <button onClick={testAlarm} disabled={testing} style={S.testBtn}>
            {testing ? 'Sending…' : '🔔 Test alarm'}
          </button>
          <button onClick={() => setShowForm(v => !v)} style={S.addBtn}>
            {showForm ? '✕ Cancel' : '+ Add Driver'}
          </button>
        </div>
      </div>

      {/* Add driver form */}
      {showForm && (
        <div style={S.formCard}>
          <p style={S.formTitle}>New Driver</p>
          <form onSubmit={createDriver} style={S.formGrid}>
            <div style={S.fieldWrap}>
              <label style={S.label}>Full Name</label>
              <input
                style={S.input}
                placeholder="e.g. Raju Kumar"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div style={S.fieldWrap}>
              <label style={S.label}>User ID (login)</label>
              <input
                style={S.input}
                placeholder="e.g. raju01"
                value={form.user_id}
                onChange={e => setForm(p => ({ ...p, user_id: e.target.value.toLowerCase().replace(/\s/g, '') }))}
              />
            </div>
            <div style={S.fieldWrap}>
              <label style={S.label}>Password</label>
              <input
                style={S.input}
                type="password"
                placeholder="Set a password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div style={S.fieldWrap}>
              <label style={S.label}>Phone (optional)</label>
              <input
                style={S.input}
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            {formErr && <p style={{ ...S.err, gridColumn: '1 / -1' }}>{formErr}</p>}
            <button
              type="submit"
              disabled={saving}
              style={{ ...S.loginBtn, gridColumn: '1 / -1' }}
            >
              {saving ? 'Creating…' : 'Create Driver'}
            </button>
          </form>
        </div>
      )}

      {/* Drivers list */}
      {loading ? (
        <p style={{ color: '#9ca3af', padding: '2rem 0', textAlign: 'center' }}>Loading…</p>
      ) : drivers.length === 0 ? (
        <div style={S.empty}>
          <p style={{ fontSize: '2rem', margin: 0 }}>🚗</p>
          <p style={{ color: '#6b5744', fontWeight: 500, margin: 0 }}>No drivers yet. Add one above.</p>
        </div>
      ) : (
        <div style={S.list}>
          {drivers.map(d => (
            <div key={d.id} style={{ ...S.card, opacity: d.is_active ? 1 : 0.6 }}>
              <div style={S.cardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={S.avatar}>
                    {d.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={S.driverName}>{d.name}</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      <span style={S.userId}>@{d.user_id}</span>
                      {d.phone && <span style={S.phone}>📞 {d.phone}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...S.badge, background: d.is_active ? '#dcfce7' : '#f3f4f6', color: d.is_active ? '#16a34a' : '#6b7280' }}>
                    {d.is_active ? '● Active' : '● Inactive'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={S.actions}>
                {/* Change password inline */}
                {editingPwd === d.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      style={{ ...S.input, flex: 1, marginBottom: 0, padding: '0.4rem 0.625rem', fontSize: '0.8125rem' }}
                      autoFocus
                    />
                    <button onClick={() => savePassword(d.id)} style={S.saveBtn}>Save</button>
                    <button onClick={() => { setEditingPwd(null); setNewPwd('') }} style={S.ghostBtn}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingPwd(d.id); setNewPwd('') }} style={S.ghostBtn}>
                    🔑 Change password
                  </button>
                )}

                <button
                  onClick={() => toggleActive(d)}
                  style={{ ...S.ghostBtn, color: d.is_active ? '#d97706' : '#16a34a' }}
                >
                  {d.is_active ? '⏸ Deactivate' : '▶ Activate'}
                </button>

                <button
                  onClick={() => deleteDriver(d.id)}
                  disabled={deleting === d.id}
                  style={{ ...S.ghostBtn, color: '#dc2626' }}
                >
                  {deleting === d.id ? '…' : '🗑 Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  loginWrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loginBox:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 340, textAlign: 'center' },
  loginTitle: { fontWeight: 700, color: '#1a1109', marginBottom: '1.5rem' },
  form:       { display: 'flex', flexDirection: 'column', gap: 12 },
  input:      { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.625rem 0.75rem', fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  err:        { color: '#dc2626', fontSize: '0.8125rem', margin: 0 },
  loginBtn:   { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' },

  wrap:       { padding: 'clamp(1rem, 4vw, 2rem) clamp(0.75rem, 4vw, 2.5rem)' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 },
  title:      { fontSize: 'clamp(1.125rem, 4vw, 1.5rem)', fontWeight: 700, color: '#1a1109', margin: 0 },
  subtitle:   { fontSize: '0.8125rem', color: '#6b5744', marginTop: 4 },
  addBtn:     { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  testBtn:    { background: '#fff7ed', color: '#d97706', border: '1.5px solid rgba(217,119,6,0.4)', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  resetBtn:   { background: 'transparent', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  formCard:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' },
  formTitle:  { fontWeight: 700, color: '#1a1109', fontSize: '0.9375rem', margin: '0 0 1rem' },
  formGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' },
  fieldWrap:  { display: 'flex', flexDirection: 'column', gap: 4 },
  label:      { fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },

  empty:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: 12 },
  list:       { display: 'flex', flexDirection: 'column', gap: '0.75rem' },

  card:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 'clamp(0.875rem, 3vw, 1.125rem)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  avatar:     { width: 40, height: 40, borderRadius: '50%', background: '#d97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, flexShrink: 0 },
  driverName: { fontWeight: 700, color: '#1a1109', fontSize: '0.9375rem', margin: 0 },
  userId:     { fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 },
  phone:      { fontSize: '0.75rem', color: '#6b7280' },
  badge:      { fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 },

  actions:    { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' },
  ghostBtn:   { background: 'transparent', border: '1.5px solid #e5e7eb', borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' },
  saveBtn:    { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
}
