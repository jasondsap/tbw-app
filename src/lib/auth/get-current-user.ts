import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { getUserByCognitoSub } from '@/lib/db/queries'
import type { User } from '@/types'

export interface AuthUser {
  cognitoSub: string
  email: string
  role: string
  dbUser: User | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cognitoUser = await getCurrentUser()
    const session     = await fetchAuthSession()

    const groups =
      (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[]) ?? []
    const role   =
      (session.tokens?.idToken?.payload?.['custom:role'] as string) ??
      groups[0] ??
      'advocate'

    const dbUser = await getUserByCognitoSub(cognitoUser.userId)

    return {
      cognitoSub: cognitoUser.userId,
      email:      cognitoUser.signInDetails?.loginId ?? '',
      role,
      dbUser,
    }
  } catch {
    return null
  }
}

export function canAccess(userRole: string, allowedRoles: string[]): boolean {
  if (userRole === 'admin') return true
  return allowedRoles.includes(userRole)
}
