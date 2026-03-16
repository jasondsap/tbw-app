export const dynamic = 'force-dynamic'
import { getStableCases } from '@/lib/db/queries'
import { StableMonitoringDashboard } from '@/components/stable/stable-monitoring-dashboard'

export default async function StablePage() {
  const cases = await getStableCases()
  return <StableMonitoringDashboard initialCases={cases} />
}
