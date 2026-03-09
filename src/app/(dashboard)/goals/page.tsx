import { redirect } from 'next/navigation'
import { getSessionWithDb } from '@/lib/auth/cognito'
import { getAllGoals } from '@/lib/db/queries'
import { GoalsCrossView } from '@/components/goals/goals-cross-view'

export default async function GoalsPage() {
  const session = await getSessionWithDb()
  if (!session) redirect('/login')

  const goals = await getAllGoals(session.dbId, session.role)
  return <GoalsCrossView initialGoals={goals as any[]} userRole={session.role} />
}
