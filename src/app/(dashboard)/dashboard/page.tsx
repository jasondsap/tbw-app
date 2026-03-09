import { redirect } from 'next/navigation'
import { getSessionWithDb } from '@/lib/auth/cognito'
import { getDashboardData } from '@/lib/db/queries'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const session = await getSessionWithDb()
  if (!session) redirect('/login')

  const data = await getDashboardData(session.dbId, session.role)
  return (
    <DashboardClient
      data={data}
      user={{ id: session.dbId, role: session.role, name: `${session.firstName} ${session.lastName}` }}
    />
  )
}
