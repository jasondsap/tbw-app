import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getLogoutUrl } from '@/lib/auth/cognito'

export async function GET(req: NextRequest) {
  const { origin } = req.nextUrl
  const logoutUrl = getLogoutUrl(`${origin}/login`)

  const res = NextResponse.redirect(logoutUrl)
  res.cookies.delete(COOKIE_NAME)
  return res
}
