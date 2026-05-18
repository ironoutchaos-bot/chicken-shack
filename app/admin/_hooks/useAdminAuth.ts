import { useState, useEffect } from 'react'

export function useAdminAuth(onAuthed?: () => void) {
  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)   // true until ping resolves

  useEffect(() => {
    fetch('/api/admin/ping')
      .then(r => {
        if (r.ok) {
          setAuthed(true)
          onAuthed?.()
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  // onAuthed intentionally excluded — callers pass stable refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(password: string): Promise<string | null> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true); return null }
    return 'Incorrect password'
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setAuthed(false)
  }

  return { authed, checking, login, logout }
}
