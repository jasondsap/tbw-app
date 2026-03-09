import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  verifyIdToken,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from '@/lib/auth/cognito'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('Cognito auth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  const redirectUri = `${origin}/api/auth/callback`
  const tokens = await exchangeCodeForTokens(code, redirectUri)

  if (!tokens?.id_token) {
    console.error('Token exchange failed')
    return NextResponse.redirect(new URL('/login?error=token_failed', origin))
  }

  const user = await verifyIdToken(tokens.id_token)
  if (!user) {
    console.error('JWT verification failed')
    return NextResponse.redirect(new URL('/login?error=invalid_token', origin))
  }

  console.log('Auth success for:', user.email, 'role:', user.role)

  const cookieValue = [
    `${COOKIE_NAME}=${tokens.id_token}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
  ].join('; ')

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': `${origin}/dashboard`,
      'Set-Cookie': cookieValue,
    },
  })
}
