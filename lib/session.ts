import type { SessionOptions } from 'iron-session'

export interface SessionData {
  ip: string
  createdAt: number
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-change-in-production-min32',
  cookieName: 'web-parser-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
  },
}
