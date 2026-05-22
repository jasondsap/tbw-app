// Send a TBW consent invitation to a participant or guardian via SMS or email.
// Mirrors the ddor-platform pattern (transactional supersede + atomic per-channel
// dispatch with provider_message_id capture and redacted audit logging).

import { randomBytes } from 'node:crypto'
import { sql } from '@/lib/db'
import { writeAuditLog } from '@/lib/db/queries'
import { normalizeUsPhoneE164, sendSms } from '@/lib/sms/twilio'
import { sendEmail, FROM_ADDRESS } from '@/lib/email'
import { Resend } from 'resend'
import { getFormDefinition } from './forms'

export type ConsentChannel = 'sms' | 'email'

const EXPIRY_DAYS = 30
const SENDER_PHONE = '(502) 276-6136'

export interface SendConsentInviteInput {
  caseId:          string
  formType:        string
  channel:         ConsentChannel
  sentToOverride?: string          // when explicitly provided (e.g. guardian email)
  participantName: string
  participantEmail: string | null
  participantPhone: string | null
  sentByUserId:    string
  customMessage?:  string | null
}

export interface SendConsentInviteResult {
  invitationId:    string
  token:           string
  participantUrl:  string
  expiresAt:       string
  channel:         ConsentChannel
  success:         boolean
  message:         string
  providerMessageId?: string
}

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function buildParticipantUrl(formType: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.CONSENT_BASE_URL ??
    ''
  if (!base) throw new Error('NEXT_PUBLIC_APP_URL must be set')
  const root = base.endsWith('/') ? base.slice(0, -1) : base
  return `${root}/consent/sign/${formType}?token=${token}`
}

function redact(address: string, channel: ConsentChannel): string {
  if (channel === 'sms') {
    const digits = address.replace(/\D/g, '')
    return `***-***-${digits.slice(-4)}`
  }
  const at = address.indexOf('@')
  if (at <= 0) return '***'
  return `***@${address.slice(at + 1)}`
}

function renderSmsBody(params: {
  participantUrl: string
  documentLabel:  string
  customMessage?: string | null
}): string {
  const prefix = params.customMessage ? `${params.customMessage.trim()}\n\n` : ''
  return (
    `${prefix}The Book Works: Please complete your ${params.documentLabel}. ` +
    `Link: ${params.participantUrl}. Questions? Call or text ${SENDER_PHONE}.`
  )
}

function renderEmailHtml(params: {
  participantUrl: string
  documentLabel:  string
  participantName: string
  customMessage?: string | null
}): string {
  const custom = params.customMessage
    ? `<p style="margin:0 0 16px;color:#334155;">${params.customMessage.trim().replace(/\n/g, '<br/>')}</p>`
    : ''
  return `
<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0d9488;font-weight:600;">The Book Works</p>
    <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">Please complete: ${params.documentLabel}</h1>
    <p style="margin:0 0 16px;color:#334155;line-height:1.55;">Hi ${params.participantName},</p>
    ${custom}
    <p style="margin:0 0 16px;color:#334155;line-height:1.55;">
      We need your signature on the form below before we can begin working with you.
      This only takes a few minutes and can be done on your phone.
    </p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${params.participantUrl}"
         style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">
        Open the form
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#64748b;">Or paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#0d9488;">${params.participantUrl}</p>
    <p style="margin:0;font-size:12px;color:#64748b;">
      Questions? Call or text ${SENDER_PHONE}. This link expires in ${EXPIRY_DAYS} days.
    </p>
  </div>
</body></html>`
}

function renderEmailText(params: {
  participantUrl: string
  documentLabel:  string
  participantName: string
  customMessage?: string | null
}): string {
  const lines: string[] = []
  lines.push(`Hi ${params.participantName},`)
  lines.push('')
  if (params.customMessage) {
    lines.push(params.customMessage.trim(), '')
  }
  lines.push(
    `The Book Works needs your signature on the ${params.documentLabel}.`,
    '',
    'You can review and sign on your phone or computer. It takes a few minutes.',
    '',
    params.participantUrl,
    '',
    `Questions? Call or text ${SENDER_PHONE}.`,
    '',
    `This link expires in ${EXPIRY_DAYS} days.`,
  )
  return lines.join('\n')
}

// Internal: send a Resend email with both HTML and text. The existing
// src/lib/email/index.ts helper only handles HTML, so we use the Resend client
// directly for richer participant-facing emails.
async function sendConsentEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY must be set')
  const client = new Resend(apiKey)
  const result = await client.emails.send({
    from:    FROM_ADDRESS,
    to:      [opts.to],
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
  })
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`)
  }
  if (!result.data?.id) {
    throw new Error('Resend returned no message id')
  }
  return { id: result.data.id }
}

export async function sendConsentInvite(
  input: SendConsentInviteInput
): Promise<SendConsentInviteResult> {
  const {
    caseId, formType, channel, sentToOverride,
    participantName, participantEmail, participantPhone,
    sentByUserId, customMessage,
  } = input

  const form = getFormDefinition(formType)
  if (!form) {
    return {
      invitationId: '', token: '', participantUrl: '', expiresAt: '',
      channel, success: false,
      message: `Unknown form type: ${formType}`,
    }
  }
  const documentLabel = form.name

  // Resolve recipient
  let recipient: string
  if (sentToOverride) {
    if (channel === 'sms') {
      const e164 = normalizeUsPhoneE164(sentToOverride)
      if (!e164) {
        return {
          invitationId: '', token: '', participantUrl: '', expiresAt: '',
          channel, success: false,
          message: 'Provided phone number is not a valid US number.',
        }
      }
      recipient = e164
    } else {
      if (!sentToOverride.includes('@')) {
        return {
          invitationId: '', token: '', participantUrl: '', expiresAt: '',
          channel, success: false,
          message: 'Provided email address is invalid.',
        }
      }
      recipient = sentToOverride
    }
  } else if (channel === 'sms') {
    const e164 = normalizeUsPhoneE164(participantPhone)
    if (!e164) {
      return {
        invitationId: '', token: '', participantUrl: '', expiresAt: '',
        channel, success: false,
        message: 'Participant has no valid phone number on file.',
      }
    }
    recipient = e164
  } else {
    if (!participantEmail || !participantEmail.includes('@')) {
      return {
        invitationId: '', token: '', participantUrl: '', expiresAt: '',
        channel, success: false,
        message: 'Participant has no valid email address on file.',
      }
    }
    recipient = participantEmail
  }

  // Generate token + expiry
  const token = generateToken()
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Supersede prior open invitations for this (case, form, channel), then insert
  // the new row. Sequential awaits because the Neon HTTP driver has no
  // sql.transaction() — matches the convention noted in CLAUDE.md.
  await sql`
    UPDATE consent_invitations
    SET status = 'superseded', superseded_at = NOW(), updated_at = NOW()
    WHERE case_id   = ${caseId}
      AND form_type = ${formType}
      AND channel   = ${channel}
      AND status    IN ('sent', 'opened')
  `
  const inserted = await sql`
    INSERT INTO consent_invitations (
      case_id, form_type, token, channel, sent_to,
      sent_by, expires_at, custom_message
    ) VALUES (
      ${caseId}, ${formType}, ${token}, ${channel}, ${recipient},
      ${sentByUserId}, ${expiresAt.toISOString()}, ${customMessage ?? null}
    )
    RETURNING id
  `
  const invitationId = (inserted[0] as any).id
  const participantUrl = buildParticipantUrl(formType, token)

  // Dispatch
  let providerMessageId: string | undefined
  try {
    if (channel === 'sms') {
      const body = renderSmsBody({ participantUrl, documentLabel, customMessage })
      const result = await sendSms({
        to: recipient,
        body,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
      })
      providerMessageId = result.sid
      await sql`
        UPDATE consent_invitations
        SET provider_message_id = ${providerMessageId},
            send_status = ${result.status},
            updated_at  = NOW()
        WHERE id = ${invitationId}
      `
    } else {
      const html = renderEmailHtml({ participantUrl, documentLabel, participantName, customMessage })
      const text = renderEmailText({ participantUrl, documentLabel, participantName, customMessage })
      const result = await sendConsentEmail({
        to: recipient,
        subject: `Please complete your ${documentLabel}`,
        html, text,
      })
      providerMessageId = result.id
      await sql`
        UPDATE consent_invitations
        SET provider_message_id = ${providerMessageId},
            send_status = 'sent',
            updated_at  = NOW()
        WHERE id = ${invitationId}
      `
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error'
    await sql`
      UPDATE consent_invitations
      SET status = 'failed', send_error = ${message}, updated_at = NOW()
      WHERE id = ${invitationId}
    `
    await writeAuditLog({
      userId:       sentByUserId,
      action:       `consent_invite_${channel}_failed`,
      resourceType: 'consent_invitations',
      resourceId:   invitationId,
      newValues: {
        channel,
        form_type:           formType,
        recipient_redacted:  redact(recipient, channel),
        error:               message,
      },
    })
    return {
      invitationId, token, participantUrl,
      expiresAt: expiresAt.toISOString(),
      channel, success: false,
      message: `Send failed: ${message}`,
    }
  }

  await writeAuditLog({
    userId:       sentByUserId,
    action:       `consent_invite_${channel}_sent`,
    resourceType: 'consent_invitations',
    resourceId:   invitationId,
    newValues: {
      channel,
      form_type:           formType,
      recipient_redacted:  redact(recipient, channel),
      provider_message_id: providerMessageId,
    },
  })

  return {
    invitationId, token, participantUrl,
    expiresAt: expiresAt.toISOString(),
    channel, success: true,
    message:
      channel === 'sms'
        ? `${documentLabel} link sent. The participant will receive an SMS shortly.`
        : `${documentLabel} email sent.`,
    providerMessageId,
  }
}
