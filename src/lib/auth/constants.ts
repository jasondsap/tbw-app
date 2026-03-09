// Edge-runtime safe — no jose, no next/headers
export const COOKIE_NAME = 'tbw_id_token'
export const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

const DOMAIN    = 'https://us-east-2oykrgvm1t.auth.us-east-2.amazoncognito.com'
const CLIENT_ID = '43sngf6eqd8igvh9jmpkpor2or'

export function getLoginUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  redirectUri,
    scope:         'openid email profile',
  })
  return `${DOMAIN}/oauth2/authorize?${params}`
}

export function getLogoutUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id:  CLIENT_ID,
    logout_uri: redirectUri,
  })
  return `${DOMAIN}/logout?${params}`
}
