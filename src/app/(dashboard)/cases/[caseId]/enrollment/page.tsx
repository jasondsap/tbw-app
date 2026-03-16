export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { getCaseForEnrollment } from '@/lib/db/queries'
import { EnrollmentForm } from '@/components/enrollment/enrollment-form'

interface PageProps { params: { caseId: string } }

export default async function EnrollmentPage({ params }: PageProps) {
  const caseData = await getCaseForEnrollment(params.caseId)
  if (!caseData) notFound()

  const participantName = `${caseData.first_name} ${caseData.last_name}`

  const prefill = {
    participant: {
      firstName:     caseData.first_name ?? '',
      lastName:      caseData.last_name ?? '',
      preferredName: caseData.preferred_name ?? '',
      pronouns:      caseData.pronouns ?? '',
      howHeard:      caseData.how_heard ? [caseData.how_heard] : [],
      howHeardOrg:   '',
      howHeardOther: '',
      tbwGoals:      [],
      tbwGoalsOther: '',
    },
    education: {
      currentSchool:      caseData.current_school ?? '',
      currentGrade:       caseData.current_grade ?? '',
      highestEdCompleted: '',
      lastAttended:       '',
      lastAttendedWhere:  '',
      hsStartYear:        '',
      graduated:          false,
      employed:           false,
      occupation:         '',
      healthConcerns:     '',
    },
  }

  // Parse existing form data from DB if it exists
  const existingData = caseData.existingForm
    ? {
        ...caseData.existingForm.participant_section,
        ...caseData.existingForm.education_section,
        ...caseData.existingForm.goals_section,
        ...caseData.existingForm.challenges_section,
        ...caseData.existingForm.barriers_data,
        ...caseData.existingForm.resources_section,
      }
    : null

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3.5">
        <div className="flex items-center gap-4 max-w-5xl mx-auto">
          <Link href={`/cases/${params.caseId}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />{participantName}
          </Link>
          <span className="text-slate-200">/</span>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-teal-600" />
            <h1 className="text-sm font-bold text-slate-800 font-display">Enrollment Form</h1>
          </div>
          <span className="ml-auto text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md font-mono">
            {caseData.case_number}
          </span>
        </div>
      </div>
      <div className="max-w-5xl mx-auto">
        <EnrollmentForm
          caseId={params.caseId}
          participantName={participantName}
          prefill={prefill as any}
          existingData={existingData}
        />
      </div>
    </div>
  )
}
