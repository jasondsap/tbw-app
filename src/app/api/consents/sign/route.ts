import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { sql } from '@/lib/db'
import { writeAuditLog } from '@/lib/db/queries'
import { getApiUser } from '@/lib/auth/api-auth'
import { getFormDefinition } from '@/lib/consents/forms'
import { generateConsentPDF, ConsentPdfScreen } from '@/lib/consents/pdf'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { BUCKET } from '@/lib/storage/s3'

export const runtime = 'nodejs'

const s3 = new S3Client({
  region: process.env.APP_AWS_REGION ?? 'us-east-2',
  credentials: {
    accessKeyId:     process.env.APP_AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY ?? '',
  },
})

interface SignBody {
  caseId?:               string
  formType?:             string
  formVersion?:          string
  answers?:              Record<string, string | string[] | null>
  signedName?:           string
  invitationToken?:      string
  outcome?:              'signed' | 'declined'
  outcomeAtScreenKey?:   string
}

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? null
}

function resolveAnswerText(
  screenType: string,
  raw: string | string[] | null | undefined,
  options: { value: string; label: string }[] | undefined,
): string | null {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null
    const labels = raw.map(v => {
      const opt = options?.find(o => o.value === v)
      return opt?.label ?? v
    })
    return labels.join(', ')
  }
  if (raw === '') return null
  if (screenType === 'choice' || screenType === 'attestation') {
    const opt = options?.find(o => o.value === raw)
    if (opt) return opt.label
  }
  return String(raw)
}

export async function POST(req: NextRequest) {
  let body: SignBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const caseId   = body.caseId
  const formType = body.formType
  const answers  = body.answers ?? {}
  const signedName = typeof body.signedName === 'string' ? body.signedName.trim() : ''
  const outcome: 'signed' | 'declined' = body.outcome === 'declined' ? 'declined' : 'signed'
  const outcomeAtScreenKey = typeof body.outcomeAtScreenKey === 'string' ? body.outcomeAtScreenKey : null

  if (!caseId) return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
  if (!formType) return NextResponse.json({ error: 'formType is required' }, { status: 400 })

  const form = getFormDefinition(formType)
  if (!form) {
    return NextResponse.json({ error: `Unknown formType: ${formType}` }, { status: 400 })
  }
  if (body.formVersion && body.formVersion !== form.version) {
    return NextResponse.json({
      error: `formVersion mismatch — expected ${form.version}, got ${body.formVersion}`,
    }, { status: 400 })
  }

  if (outcome === 'signed' && outcomeAtScreenKey) {
    return NextResponse.json({
      error: 'outcomeAtScreenKey must be omitted when outcome is "signed"',
    }, { status: 400 })
  }
  if (outcome === 'declined' && !outcomeAtScreenKey) {
    return NextResponse.json({
      error: 'outcomeAtScreenKey is required when outcome is "declined"',
    }, { status: 400 })
  }
  if (outcome === 'declined' && outcomeAtScreenKey) {
    const exists = form.screens.some(s => s.key === outcomeAtScreenKey)
    if (!exists) {
      return NextResponse.json({
        error: `outcomeAtScreenKey '${outcomeAtScreenKey}' is not a screen in this form`,
      }, { status: 400 })
    }
  }
  if (outcome === 'signed' && signedName.length === 0) {
    return NextResponse.json({ error: 'signedName is required' }, { status: 400 })
  }

  // Auth: Cognito session XOR invitation token
  const authUser = await getApiUser(req)
  const hasToken = typeof body.invitationToken === 'string' && body.invitationToken.length > 0

  if (authUser && hasToken) {
    return NextResponse.json({
      error: 'Provide either a session or an invitation token, not both.',
    }, { status: 400 })
  }
  if (!authUser && !hasToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let administeredBy: 'staff' | 'self_service'
  let administeredByUserId: string | null = null
  let invitationId: string | null = null

  if (authUser) {
    administeredBy = 'staff'
    administeredByUserId = authUser.dbId
  } else {
    const invRows = await sql`
      SELECT id, case_id, form_type, status, expires_at
      FROM consent_invitations
      WHERE token = ${body.invitationToken}
      LIMIT 1
    `
    const inv = invRows[0] as any
    if (!inv) {
      return NextResponse.json({ error: 'Invalid or unknown invitation' }, { status: 401 })
    }
    if (inv.case_id !== caseId) {
      return NextResponse.json({ error: 'Invitation does not match caseId' }, { status: 403 })
    }
    if (inv.form_type !== formType) {
      return NextResponse.json({ error: 'Invitation does not match formType' }, { status: 403 })
    }
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }
    if (inv.status === 'completed') {
      return NextResponse.json({ error: 'Invitation already completed' }, { status: 409 })
    }
    administeredBy = 'self_service'
    invitationId = inv.id
  }

  // Load case + participant for the PDF
  const caseRows = await sql`
    SELECT
      c.id AS case_id, c.case_number,
      p.id AS participant_id,
      p.first_name, p.last_name, p.preferred_name,
      p.date_of_birth
    FROM cases c
    JOIN participants p ON p.id = c.participant_id
    WHERE c.id = ${caseId}
    LIMIT 1
  `
  const caseRow = caseRows[0] as any
  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }
  const participantName = (caseRow.preferred_name && caseRow.preferred_name.trim().length > 0)
    ? `${caseRow.preferred_name} ${caseRow.last_name}`
    : `${caseRow.first_name} ${caseRow.last_name}`

  // Build PDF screens
  const screensForPdf: ConsentPdfScreen[] = []
  const trimAtIndex = outcome === 'declined' && outcomeAtScreenKey
    ? form.screens.findIndex(s => s.key === outcomeAtScreenKey)
    : form.screens.length - 1
  for (let i = 0; i <= trimAtIndex; i++) {
    const screen = form.screens[i]
    if (screen.type === 'intro' || screen.type === 'review') {
      // Pure informational screens don't need to appear in the legal PDF.
      continue
    }
    const raw = answers[screen.key]
    const answerText = resolveAnswerText(screen.type, raw, screen.options)
    screensForPdf.push({
      displayOrder: i,
      prompt:       screen.prompt,
      answerText,
    })
  }

  const signedAt = new Date()
  const ip = clientIp(req)
  let pdfBytes: Buffer
  let pdfSha256: string
  try {
    const r = generateConsentPDF({
      documentName: form.name,
      completedDate: signedAt,
      participantName,
      participantDob: caseRow.date_of_birth ? new Date(caseRow.date_of_birth) : null,
      signedName: signedName || `${caseRow.first_name} ${caseRow.last_name}`,
      signedAt,
      signedIp: ip,
      screens: screensForPdf,
      outcome,
    })
    pdfBytes = r.bytes
    pdfSha256 = r.sha256
  } catch (err) {
    console.error('[consents/sign] PDF generation failed', err)
    return NextResponse.json({ error: 'Failed to generate consent PDF' }, { status: 500 })
  }

  // Upload to S3 first; if the DB insert fails afterward we clean up.
  const signedAtIso = signedAt.toISOString()
  const s3Key = `cases/${caseId}/consents/${formType}/${form.version}/${signedAtIso}.pdf`
  try {
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         s3Key,
      Body:        pdfBytes,
      ContentType: 'application/pdf',
    }))
  } catch (err) {
    console.error('[consents/sign] S3 upload failed', err)
    return NextResponse.json({ error: 'Failed to store consent PDF' }, { status: 500 })
  }

  // Find the matching consents row to roll up the snapshot
  const consentRows = await sql`
    SELECT id FROM consents
    WHERE case_id = ${caseId} AND form_type = ${formType}
    ORDER BY signed_at DESC NULLS LAST, id ASC
    LIMIT 1
  `
  const consentId = (consentRows[0] as any)?.id ?? null

  const signatureId = randomUUID()
  const persistedName = signedName.length > 0
    ? signedName
    : `${caseRow.first_name} ${caseRow.last_name}`.trim() || '(declined)'

  try {
    await sql`
      INSERT INTO consent_signatures (
        id, case_id, consent_id, form_type, form_version,
        invitation_id, administered_by, administered_by_user_id,
        signed_name, signed_data, signed_at, signed_ip, signed_user_agent,
        pdf_s3_key, pdf_sha256, outcome, outcome_at_screen_key
      ) VALUES (
        ${signatureId}, ${caseId}, ${consentId}, ${formType}, ${form.version},
        ${invitationId}, ${administeredBy}, ${administeredByUserId},
        ${persistedName}, ${JSON.stringify(answers)}, ${signedAtIso},
        ${ip ?? null}::inet, ${req.headers.get('user-agent') ?? null},
        ${s3Key}, ${pdfSha256}, ${outcome}, ${outcomeAtScreenKey}
      )
    `
  } catch (err) {
    console.error('[consents/sign] consent_signatures insert failed — cleaning up S3', err)
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }))
    } catch (cleanupErr) {
      console.error('[consents/sign] S3 cleanup failed; orphan object remains', { s3Key, cleanupErr })
    }
    return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 })
  }

  // Roll up to the consents row (the panel reads from there for status)
  if (consentId) {
    try {
      if (outcome === 'signed') {
        await sql`
          UPDATE consents
          SET status = 'signed', signed_at = ${signedAtIso}, signed_by_name = ${persistedName}
          WHERE id = ${consentId}
        `
      } else {
        await sql`
          UPDATE consents
          SET status = 'declined', updated_at = NOW()
          WHERE id = ${consentId}
        `
      }
    } catch (err) {
      console.error('[consents/sign] consents rollup update failed', err)
    }
  }

  // Mark invitation completed
  if (invitationId) {
    try {
      await sql`
        UPDATE consent_invitations
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = ${invitationId}
      `
    } catch (err) {
      console.error('[consents/sign] failed to mark invitation completed', err)
    }
  }

  await writeAuditLog({
    userId:       administeredByUserId ?? '00000000-0000-0000-0000-000000000000',
    action:       outcome === 'signed' ? 'consent_signed' : 'consent_declined',
    resourceType: 'consent_signatures',
    resourceId:   signatureId,
    newValues: {
      caseId, formType, formVersion: form.version,
      administeredBy, pdfS3Key: s3Key,
    },
    ipAddress: ip ?? undefined,
  })

  return NextResponse.json({
    signatureId,
    outcome,
    pdfDownloadUrl: `/api/consents/${signatureId}/pdf`,
  }, { status: 201 })
}
