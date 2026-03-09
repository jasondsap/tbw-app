import { getSiteDetail } from '@/lib/db/queries'
import { SiteDetailClient } from '@/components/sites/site-detail-client'
import { notFound } from 'next/navigation'

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const data = await getSiteDetail(params.siteId)
  if (!data.site) notFound()
  return <SiteDetailClient data={data} />
}
