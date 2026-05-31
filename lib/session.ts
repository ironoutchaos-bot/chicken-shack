import type { SessionOptions } from 'iron-session'

export interface SessionData {
  userId: string
  phone:  string
  name:   string | null
}

// Fail fast at startup if the secret is missing — avoids a cryptic runtime crash
if (typeof process.env.SESSION_SECRET !== 'string' || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET env var must be set and at least 32 characters long.')
}

export const sessionOptions: SessionOptions = {
  password:   process.env.SESSION_SECRET,
  cookieName: 'cs-auth',
  cookieOptions: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 days
  },
}
