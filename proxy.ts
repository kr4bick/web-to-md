import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/session'
import { sessionOptions } from '@/lib/session'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

function getAllowedIps(): string[] {
  const env = process.env.ALLOWED_IPS ?? '127.0.0.1,::1'
  return env.split(',').map(ip => ip.trim()).filter(Boolean)
}

const HEALTHCHECK_PATHS = ['/api/history', '/api/debug']

export async function proxy(request: NextRequest) {
  // Allow healthcheck paths through without IP check
  if (HEALTHCHECK_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const clientIp = getClientIp(request)
  const allowedIps = getAllowedIps()

  const isAllowed = allowedIps.includes(clientIp)

  if (!isAllowed) {
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    if (isApiRoute) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/access-denied'
    return NextResponse.redirect(url)
  }

  // IP is allowed — handle session
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  if (!session.ip) {
    // New session — create it
    session.ip = clientIp
    session.createdAt = Date.now()
    await session.save()
  } else if (session.ip !== clientIp) {
    // IP changed — recreate session for new IP
    session.ip = clientIp
    session.createdAt = Date.now()
    await session.save()
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
