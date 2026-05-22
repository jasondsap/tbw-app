export const dynamic = 'force-dynamic'
import { sql } from '@/lib/db'
import { getFormDefinition } from '@/lib/consents/forms'
import { ConsentFlow } from '@/components/consent/consent-flow'

interface PageProps {
  params:       Promise<{ type: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function ConsentSignPage({ params, searchParams }: PageProps) {
  const { type } = await params
  const { token } = await searchParams

  const form = getFormDefinition(type)
  if (!form) {
    return <ErrorScreen title="Form not found" message="This consent form is no longer available." />
  }
  if (!token) {
    return <ErrorScreen title="Link is missing a token" message="Please use the exact link you received by text or email." />
  }

  // Validate token + load case context for prefill. Self-contained query so
  // the unauthenticated middleware path doesn't need any other DB helper.
  const rows = await sql`
    SELECT
      ci.case_id, ci.form_type, ci.status, ci.expires_at,
      p.first_name, p.last_name, p.preferred_name, p.pronouns,
      p.date_of_birth, p.phone_primary, p.email,
      p.address_street, p.address_city, p.address_zip,
      p.current_school, p.current_grade
    FROM consent_invitations ci
    JOIN cases c        ON c.id = ci.case_id
    JOIN participants p ON p.id = c.participant_id
    WHERE ci.token = ${token}
    LIMIT 1
  `
  const row = rows[0] as any

  if (!row) {
    return <ErrorScreen title="Link not recognized" message="This link is invalid or has been replaced by a newer one. Please contact The Book Works at (502) 276-6136." />
  }
  if (row.form_type !== type) {
    return <ErrorScreen title="Link is for a different form" message="This link does not match the form you opened. Please use the exact link you were sent." />
  }
  if (row.status === 'completed') {
    return <ErrorScreen title="Already completed" message="This form has already been submitted. Thank you!" />
  }
  if (row.status === 'superseded') {
    return <ErrorScreen title="Newer link available" message="A newer version of this form was sent. Please use the most recent link you received." />
  }
  if (new Date(row.expires_at) < new Date()) {
    return <ErrorScreen title="Link has expired" message="This link expired. Please ask The Book Works to send a new one." />
  }

  // Mark the invitation as 'opened' (fire-and-forget — failure is non-fatal)
  if (row.status === 'sent') {
    sql`UPDATE consent_invitations SET status = 'opened', updated_at = NOW() WHERE token = ${token}`
      .catch(() => null)
  }

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
      <header className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">The Book Works</p>
          <h1 className="text-base font-bold text-slate-800">{form.name}</h1>
        </div>
      </header>
      <ConsentFlow
        form={form}
        caseId={row.case_id}
        mode="self_service"
        invitationToken={token}
        prefill={prefill}
      />
    </div>
  )
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <span className="text-2xl">!</span>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-md">{message}</p>
    </div>
  )
}
