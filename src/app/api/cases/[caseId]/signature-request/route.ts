import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'
import { sendConsentForSignature, TEMPLATES } from '@/lib/esign/dropbox-sign'

// ─── GET — list signature requests for a case ─────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const rows = await sql`
      SELECT
        sr.id, sr.doc_type, sr.title, sr.status,
        sr.participant_name, sr.participant_email,
        sr.guardian_name, sr.guardian_email,
        sr.requires_guardian,
        sr.participant_signed_at, sr.guardian_signed_at,
        sr.completed_at, sr.created_at,
        sr.hellosign_request_id,
        u.first_name || ' ' || u.last_name AS sent_by_name
      FROM signature_requests sr
      LEFT JOIN users u ON u.id = sr.sent_by
      WHERE sr.case_id = ${params.caseId}
      ORDER BY sr.created_at DESC
    `
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error('List signature requests error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST — send a new signature request ─────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  // Only intake specialists, coordinators, admins can send
  if (!['admin', 'education_coordinator', 'intake_specialist'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      docType,
      participantName,
      participantEmail,
      requiresGuardian,
      guardianName,
      guardianEmail,
      prefillFields,
    } = body

    if (!docType || !participantName || !participantEmail) {
      return NextResponse.json(
        { error: 'docType, participantName, and participantEmail are required' },
        { status: 400 }
      )
    }

    if (requiresGuardian && (!guardianEmail || !guardianName)) {
      return NextResponse.json(
        { error: 'Guardian name and email required for participants under 18' },
        { status: 400 }
      )
    }

    const templateId = TEMPLATES[docType as keyof typeof TEMPLATES]
    if (!templateId) {
      return NextResponse.json(
        { error: `No template configured for doc type: ${docType}` },
        { status: 400 }
      )
    }

    const DOC_TYPE_TITLES: Record<string, string> = {
      tbw_consent:        'TBW Consent to Participate',
      jcps_roi:           'JCPS Release of Information',
      cascade_consent:    'Cascade JCPS Consent',
      medical_waiver:     'Medical Waiver',
      emergency_contact:  'Emergency Contact Form',
    }

    const title = DOC_TYPE_TITLES[docType] ?? 'Consent Form'

    // Send via Dropbox Sign
    const result = await sendConsentForSignature({
      templateId,
      title,
      caseId:           params.caseId,
      participantName,
      participantEmail,
      requiresGuardian: !!requiresGuardian,
      guardianName,
      guardianEmail,
      prefillFields,
    })

    // Record in DB
    const rows = await sql`
      INSERT INTO signature_requests (
        case_id, hellosign_request_id, hellosign_template_id,
        doc_type, title,
        participant_email, participant_name,
        guardian_email, guardian_name, requires_guardian,
        status, sent_by
      ) VALUES (
        ${params.caseId}, ${result.requestId}, ${templateId},
        ${docType}, ${title},
        ${participantEmail}, ${participantName},
        ${guardianEmail ?? null}, ${guardianName ?? null}, ${!!requiresGuardian},
        'out_for_signature', ${user.dbId}
      )
      RETURNING id, status, created_at
    `

    return NextResponse.json({ ok: true, ...rows[0], requestId: result.requestId }, { status: 201 })

  } catch (err: any) {
    console.error('Send signature request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
