export const dynamic = 'force-dynamic'
import { getSites } from '@/lib/db/queries'
import { SitesDashboard } from '@/components/sites/sites-dashboard'

export default async function SitesPage() {
  const sites = await getSites()
  return <SitesDashboard initialSites={sites as any[]} />
}
