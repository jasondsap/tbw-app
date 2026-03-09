import { redirect } from 'next/navigation'
import { getLoginUrl } from '@/lib/auth/cognito'
import { headers } from 'next/headers'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:    'Authentication failed. Please try again.',
  no_code:        'No authorization code received.',
  token_failed:   'Could not retrieve session token.',
  invalid_token:  'Session token was invalid.',
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  // No error — auto-redirect to Cognito hosted UI
  if (!error) {
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const callbackUrl = `${proto}://${host}/api/auth/callback`
    redirect(getLoginUrl(callbackUrl))
  }

  // Show error page with retry button
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-xl">⚠</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Sign In Failed</h1>
        <p className="text-sm text-slate-500 mb-6">
          {ERROR_MESSAGES[error ?? ''] ?? 'An unexpected error occurred.'}
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
        >
          Try Again
        </a>
        <p className="text-xs text-slate-400 mt-4">
          Contact your administrator if this problem persists.
        </p>
      </div>
    </div>
  )
}
