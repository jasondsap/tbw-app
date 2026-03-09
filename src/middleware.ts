import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getLoginUrl } from '@/lib/auth/constants'

const PUBLIC_PATHS = [
  '/api/auth',
  '/login',
  '/_next',
  '/favicon',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const allCookies = req.cookies.getAll()
  const token = req.cookies.get(COOKIE_NAME)?.value

  console.log(`[middleware] ${pathname} | COOKIE_NAME="${COOKIE_NAME}" | token=${token ? 'YES('+token.length+')' : 'NO'} | all cookies: ${allCookies.map(c=>c.name).join(',')}`)

  if (!token) {
    const callbackUrl = new URL('/api/auth/callback', req.url).toString()
    return NextResponse.redirect(getLoginUrl(callbackUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
