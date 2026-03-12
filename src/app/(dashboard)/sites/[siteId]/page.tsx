import { getSiteDetail } from '@/lib/db/queries'
import { SiteDetailClient } from '@/components/sites/site-detail-client'
import { notFound } from 'next/navigation'

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const data = await getSiteDetail(siteId)
  if (!data.site) notFound()
  return <SiteDetailClient data={data} />
}
