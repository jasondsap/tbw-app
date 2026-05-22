import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'
import {
  sendConsentInvite,
  SendConsentInviteResult,
  ConsentChannel,
} from '@/lib/consents/invite-sender'
import { getFormDefinition } from '@/lib/consents/forms'

export const runtime = 'nodejs'

interface InviteBody {
  caseId?:          string
  formType?:        string
  sendVia?:         string[]
  customMessage?:   string
  emailOverride?:   string
  phoneOverride?:   string
}

function isChannel(v: unknown): v is ConsentChannel {
  return v === 'sms' || v === 'email'
}

export async function POST(req: NextRequest) {
  const authUser = await getApiUser(req)
  if (!authUser) return unauthorized()

  // Only staff with intake/coord/admin roles can send
  if (!['admin', 'education_coordinator', 'intake_specialist'].includes(authUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: InviteBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const caseId   = body.caseId
  const formType = body.formType
  const sendVia  = Array.isArray(body.sendVia) ? body.sendVia : null
  const customMessage =
    typeof body.customMessage === 'string' && body.customMessage.trim().length > 0
      ? body.customMessage.trim()
      : null

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }
  if (!formType || !getFormDefinition(formType)) {
    return NextResponse.json({ error: 'Unknown formType' }, { status: 400 })
  }
  if (!sendVia || sendVia.length === 0) {
    return NextResponse.json({ error: 'sendVia must include at least one channel' }, { status: 400 })
  }
  const channels: ConsentChannel[] = []
  for (const v of sendVia) {
    if (!isChannel(v)) {
      return NextResponse.json({ error: `Unknown channel '${v}'` }, { status: 400 })
    }
    if (!channels.includes(v)) channels.push(v)
  }

  // Load case + participant for recipient defaults
  const rows = await sql`
    SELECT
      c.id AS case_id,
      p.first_name, p.last_name, p.preferred_name,
      p.email, p.phone_primary
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    WHERE c.id = ${caseId}
    LIMIT 1
  `
  const row = rows[0] as any
  if (!row) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }
  const participantName = (row.preferred_name && row.preferred_name.trim().length > 0)
    ? `${row.preferred_name} ${row.last_name}`
    : `${row.first_name} ${row.last_name}`

  const results: SendConsentInviteResult[] = []
  for (const ch of channels) {
    const r = await sendConsentInvite({
      caseId,
      formType,
      channel: ch,
      participantName,
      participantEmail: row.email,
      participantPhone: row.phone_primary,
      sentToOverride:
        ch === 'email' ? body.emailOverride :
        ch === 'sms'   ? body.phoneOverride :
        undefined,
      sentByUserId: authUser.dbId,
      customMessage,
    })
    results.push(r)
  }

  const ok = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  if (ok.length === 0) {
    return NextResponse.json({
      error: 'All channels failed',
      failedVia: failed.map(f => ({ channel: f.channel, message: f.message })),
    }, { status: 400 })
  }

  const primary = ok[0]
  return NextResponse.json(
    {
      invitationId:   primary.invitationId,
      token:          primary.token,
      participantUrl: primary.participantUrl,
      expiresAt:      primary.expiresAt,
      sentVia:        ok.map(r => r.channel),
      failedVia:      failed.map(f => ({ channel: f.channel, message: f.message })),
    },
    { status: 201 }
  )
}

// List invitations for a case so the panel can show status.
export async function GET(req: NextRequest) {
  const authUser = await getApiUser(req)
  if (!authUser) return unauthorized()

  const caseId = req.nextUrl.searchParams.get('caseId')
  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  }

  const rows = await sql`
    SELECT
      ci.id, ci.form_type, ci.channel, ci.sent_to, ci.status,
      ci.expires_at, ci.sent_at, ci.completed_at,
      ci.send_status, ci.send_error,
      u.first_name || ' ' || u.last_name AS sent_by_name
    FROM consent_invitations ci
    LEFT JOIN users u ON u.id = ci.sent_by
    WHERE ci.case_id = ${caseId}
    ORDER BY ci.sent_at DESC
  `
  return NextResponse.json(rows)
}
