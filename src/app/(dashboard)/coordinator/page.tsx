import { getCoordinatorDashboard } from '@/lib/db/queries'
import { CoordinatorDashboard } from '@/components/coordinator/coordinator-dashboard'

export default async function CoordinatorPage() {
  const data = await getCoordinatorDashboard()
  return <CoordinatorDashboard data={data} />
}
