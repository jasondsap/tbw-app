import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, verifyIdToken } from '@/lib/auth/cognito'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ 
      status: 'no_cookie',
      cookieName: COOKIE_NAME,
      allCookies: cookieStore.getAll().map(c => c.name)
    })
  }

  const user = await verifyIdToken(token)
  return NextResponse.json({
    status: user ? 'valid' : 'invalid_token',
    tokenLength: token.length,
    user: user ? { email: user.email, role: user.role } : null
  })
}
