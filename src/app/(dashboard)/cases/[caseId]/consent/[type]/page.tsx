export const dynamic = 'force-dynamic'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth/cognito'
import { sql } from '@/lib/db'
import { getFormDefinition } from '@/lib/consents/forms'
import { ConsentFlow } from '@/components/consent/consent-flow'

interface PageProps {
  params: Promise<{ caseId: string; type: string }>
}

export default async function StaffConsentPage({ params }: PageProps) {
  const { caseId, type } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const form = getFormDefinition(type)
  if (!form) notFound()

  const rows = await sql`
    SELECT
      c.id AS case_id, c.case_number,
      p.first_name, p.last_name, p.preferred_name, p.pronouns,
      p.date_of_birth, p.phone_primary, p.email,
      p.address_street, p.address_city, p.address_zip,
      p.current_school, p.current_grade
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    WHERE c.id = ${caseId}
    LIMIT 1
  `
  const row = rows[0] as any
  if (!row) notFound()

  const participantName = (row.preferred_name && row.preferred_name.trim().length > 0)
    ? `${row.preferred_name} ${row.last_name}`
    : `${row.first_name} ${row.last_name}`
  const addressParts = [row.address_street, row.address_city, row.address_zip].filter(Boolean)
  const prefill: Record<string, string> = {
    'participant.firstName':     row.first_name ?? '',
    'participant.lastName':      row.last_name ?? '',
    'participant.preferredName': row.preferred_name ?? '',
    'participant.pronouns':      row.pronouns ?? '',
    'participant.phonePrimary':  row.phone_primary ?? '',
    'participant.email':         row.email ?? '',
    'participant.address':       addressParts.join(', '),
    'participant.currentSchool': row.current_school ?? '',
    'participant.currentGrade':  row.current_grade ?? '',
    'participant.dateOfBirth':   row.date_of_birth
      ? new Date(row.date_of_birth).toISOString().slice(0, 10)
      : '',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/cases/${caseId}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={14} /> {participantName}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">Administer: {form.name}</span>
          <span className="text-xs text-slate-400 ml-auto">{row.case_number}</span>
        </div>
      </header>
      <ConsentFlow
        form={form}
        caseId={caseId}
        mode="staff"
        prefill={prefill}
      />
    </div>
  )
}
