import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, verifyIdToken, SessionUser } from './cognito'
import { getUserByCognitoSub } from '@/lib/db/queries'

export async function getApiUser(req: NextRequest): Promise<(SessionUser & { dbId: string }) | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  const session = await verifyIdToken(token)
  if (!session) return null

  if (session.dbUserId) {
    return { ...session, dbId: session.dbUserId }
  }

  try {
    const dbUser = await getUserByCognitoSub(session.cognitoSub)
    if (!dbUser) return null
    return { ...session, dbId: (dbUser as any).id }
  } catch {
    return null
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
