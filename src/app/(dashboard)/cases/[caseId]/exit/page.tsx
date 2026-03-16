export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCaseForExit } from '@/lib/db/queries'
import { ExitWizard } from '@/components/exit/exit-wizard'

interface PageProps { params: Promise<{ caseId: string }> }

export default async function ExitPage({ params }: PageProps) {
  const { caseId } = await params
  const caseData = await getCaseForExit(caseId)
  if (!caseData) notFound()

  const participantName = caseData.preferred_name
    ? `${caseData.preferred_name} ${caseData.last_name}`
    : `${caseData.first_name} ${caseData.last_name}`

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href={`/cases/${caseId}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />{participantName}
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-base font-bold text-slate-800 font-display">Exit Workflow</h1>
          <span className="text-xs text-slate-400 ml-auto">{caseData.case_number}</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <ExitWizard
          caseId={caseId}
          caseNumber={caseData.case_number}
          participantName={participantName}
          advocateName={caseData.advocate_name ?? 'Unassigned'}
          currentSchool={caseData.current_school ?? ''}
          currentGrade={caseData.current_grade ?? ''}
          goals={(caseData.goals as any[]).map((g: any) => ({
            id:       g.id,
            text:     g.title,
            category: g.category,
            status:   g.status,
          }))}
          barriers={caseData.barriers as string[]}
        />
      </div>
    </div>
  )
}
