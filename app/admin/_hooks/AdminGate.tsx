'use client'

import { useState } from 'react'

/** Render while the ping check is in-flight — prevents login flash */
export function AdminChecking() {
  return (
    <div style={{ minHeight: '100vh', background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#d97706', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/** Login form shown when not authed */
export function AdminLoginForm({ onLogin, error, loading }: {
  onLogin: (pw: string) => void
  error: string
  loading: boolean
}) {
  const [pw, setPw] = useState('')
  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.logo}>🐔</div>
        <h1 style={S.title}>B&apos;LURU FRESH Admin</h1>
        <p style={S.sub}>Enter password to continue</p>
        <form onSubmit={e => { e.preventDefault(); onLogin(pw) }} style={S.form}>
          <input
            type="password" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)}
            style={S.input} autoFocus
          />
          {error && <p style={S.err}>{error}</p>}
          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  wrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc', fontFamily: 'system-ui' },
  box:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem 2rem', width: 360, textAlign: 'center', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.08)' },
  logo:  { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { fontSize: '1.25rem', fontWeight: 700, color: '#1a1109', margin: 0 },
  sub:   { fontSize: '0.875rem', color: '#6b5744', marginTop: 4, marginBottom: '1.5rem' },
  form:  { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.9375rem', outline: 'none', fontFamily: 'system-ui' },
  err:   { color: '#dc2626', fontSize: '0.8125rem', margin: 0 },
  btn:   { background: '#1a1109', color: '#fff', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui' },
}
