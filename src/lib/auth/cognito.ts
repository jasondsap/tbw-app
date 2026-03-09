import { jwtVerify, createRemoteJWKSet } from 'jose'
import { cookies } from 'next/headers'
import { getUserByCognitoSub } from '@/lib/db/queries'

// Re-export edge-safe constants so callers only need one import
export { COOKIE_NAME, COOKIE_MAX_AGE, getLoginUrl, getLogoutUrl } from './constants'
import { COOKIE_NAME } from './constants'

// ─── Config ─────────────────────────────────────────────────────────────────────

const REGION        = 'us-east-2'
const POOL_ID       = 'us-east-2_OYKRgvm1T'
const CLIENT_ID     = '43sngf6eqd8igvh9jmpkpor2or'
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? ''
const DOMAIN        = 'https://us-east-2oykrgvm1t.auth.us-east-2.amazoncognito.com'
const JWKS_URL      = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}/.well-known/jwks.json`

const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SessionUser {
  cognitoSub: string
  email:      string
  firstName:  string
  lastName:   string
  role:       string
  dbUserId:   string | null
  initials:   string
}

// ─── Token Exchange ──────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ id_token: string; access_token: string; refresh_token?: string } | null> {
  try {
    const res = await fetch(`${DOMAIN}/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri:  redirectUri,
      }),
    })
    if (!res.ok) {
      console.error('Token exchange failed:', await res.text())
      return null
    }
    return res.json()
  } catch (err) {
    console.error('Token exchange error:', err)
    return null
  }
}

// ─── JWT Verification ────────────────────────────────────────────────────────────

export async function verifyIdToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer:   `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`,
      audience: CLIENT_ID,
    })

    const sub       = payload.sub as string
    const email     = (payload.email as string) ?? ''
    const given     = (payload.given_name as string) ?? ''
    const family    = (payload.family_name as string) ?? ''
    const name      = (payload.name as string) ?? email
    const firstName = given  || name.split(' ')[0] || ''
    const lastName  = family || name.split(' ').slice(1).join(' ') || ''
    const role      = (payload['custom:role'] as string) ?? 'advocate'
    const dbUserId  = (payload['custom:db_user_id'] as string) ?? null
    const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '??'

    return { cognitoSub: sub, email, firstName, lastName, role, dbUserId, initials }
  } catch (err) {
    console.error('JWT verify failed:', err)
    return null
  }
}

// ─── Session helpers ─────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) {
      console.log('[getSession] no cookie found')
      return null
    }
    const user = await verifyIdToken(token)
    if (!user) console.log('[getSession] token invalid')
    return user
  } catch (err) {
    console.error('[getSession] error:', err)
    return null
  }
}

export async function getSessionWithDb(): Promise<(SessionUser & { dbId: string }) | null> {
  const session = await getSession()
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
