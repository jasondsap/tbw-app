import { notFound, redirect } from 'next/navigation'
import { getCaseById, getGoalsByCase, getNotesByCase, getConsentsByCase, getDocumentsByCase } from '@/lib/db/queries'
import { getSession } from '@/lib/auth/cognito'
import { CaseDetailClient } from '@/components/cases/case-detail-client'

interface PageProps { params: { caseId: string } }

export default async function CaseDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const [caseData, goals, notes, consents, documents] = await Promise.all([
    getCaseById(params.caseId),
    getGoalsByCase(params.caseId),
    getNotesByCase(params.caseId),
    getConsentsByCase(params.caseId),
    getDocumentsByCase(params.caseId),
  ])

  if (!caseData) notFound()

  return (
    <CaseDetailClient
      caseData={{ ...caseData, documents, user_role: session.role }}
      goals={goals}
      notes={notes}
      consents={consents}
    />
  )
}
