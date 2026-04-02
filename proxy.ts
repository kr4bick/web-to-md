import { NextRequest, NextResponse } from 'next/server'

const HEALTHCHECK_PATHS = ['/api/history', '/api/debug']

export async function proxy(request: NextRequest) {
  if (HEALTHCHECK_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
