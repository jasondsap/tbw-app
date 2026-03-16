export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/cognito'
import { getDashboardData } from '@/lib/db/queries'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Try to get DB data — use a fallback UUID if no DB user exists yet
  let data = null
  let dbId = session.dbUserId ?? 'no-db-user'
  
  try {
    data = await getDashboardData(dbId, session.role)
  } catch (err) {
    console.error('[dashboard] getDashboardData failed:', err)
  }

  return (
    <DashboardClient
      data={data ?? { tasks: [], recentNotes: [], caseload: [], stats: {} }}
      user={{ id: dbId, role: session.role, name: `${session.firstName} ${session.lastName}` }}
    />
  )
}
