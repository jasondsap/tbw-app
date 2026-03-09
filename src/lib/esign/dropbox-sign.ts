import * as DropboxSign from '@dropbox/sign'

// ─── Client ────────────────────────────────────────────────────────────────────

function getClient() {
  const api = new DropboxSign.SignatureRequestApi()
  api.username = process.env.DROPBOX_SIGN_API_KEY ?? ''
  return api
}

// ─── Template IDs (set in .env.local) ─────────────────────────────────────────

export const TEMPLATES = {
  tbw_consent: process.env.DROPBOX_SIGN_TEMPLATE_TBW_CONSENT ?? '',
  // Add more as templates are created:
  // jcps_roi:        process.env.DROPBOX_SIGN_TEMPLATE_JCPS_ROI ?? '',
  // cascade_consent: process.env.DROPBOX_SIGN_TEMPLATE_CASCADE ?? '',
  // medical_waiver:  process.env.DROPBOX_SIGN_TEMPLATE_MEDICAL_WAIVER ?? '',
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SendConsentFormParams {
  templateId:         string
  title:              string
  caseId:             string
  participantName:    string
  participantEmail:   string
  requiresGuardian:   boolean
  guardianName?:      string
  guardianEmail?:     string
  // Pre-fill fields from the case/participant record
  prefillFields?: Record<string, string>
}

export interface SignatureRequestResult {
  requestId:  string
  signUrl?:   string   // only returned for embedded signing
}

// ─── Send signature request via template ──────────────────────────────────────

export async function sendConsentForSignature(
  params: SendConsentFormParams
): Promise<SignatureRequestResult> {
  const api = getClient()

  const signers: DropboxSign.SubSignatureRequestTemplateSigner[] = [
    {
      role:         'participant',
      emailAddress: params.participantEmail,
      name:         params.participantName,
    },
  ]

  if (params.requiresGuardian && params.guardianEmail && params.guardianName) {
    signers.push({
      role:         'guardian',
      emailAddress: params.guardianEmail,
      name:         params.guardianName,
    })
  }

  // Build custom fields to pre-populate known data
  const customFields: DropboxSign.SubCustomField[] = []

  if (params.prefillFields) {
    for (const [name, value] of Object.entries(params.prefillFields)) {
      if (value) {
        customFields.push({ name, value, editor: 'sender', required: false })
      }
    }
  }

  const data: DropboxSign.SignatureRequestSendWithTemplateRequest = {
    templateIds:  [params.templateId],
    subject:      `Please sign: ${params.title}`,
    message:      `Hi ${params.participantName}, The Book Works needs your signature on the attached form before we can begin working with you. This only takes a minute and can be done on your phone.`,
    signers,
    customFields: customFields.length > 0 ? customFields : undefined,
    metadata:     { caseId: params.caseId },
  }

  const response = await api.signatureRequestSendWithTemplate(data)
  const requestId = response.body.signatureRequest?.signatureRequestId ?? ''

  return { requestId }
}

// ─── Cancel a signature request ───────────────────────────────────────────────

export async function cancelSignatureRequest(requestId: string): Promise<void> {
  const api = getClient()
  await api.signatureRequestCancel(requestId)
}

// ─── Get status from Dropbox Sign ─────────────────────────────────────────────

export async function getSignatureRequestStatus(requestId: string) {
  const api = getClient()
  const response = await api.signatureRequestGet(requestId)
  return response.body.signatureRequest
}

// ─── Verify webhook from Dropbox Sign ─────────────────────────────────────────
// Dropbox Sign sends a hash of the payload + API key to verify authenticity

export function verifyWebhookSignature(
  payload: string,
  receivedHash: string
): boolean {
  // Dropbox Sign uses HMAC-SHA256 with the API key as the secret
  // The hash comes in the header: x-hellosign-signature
  const crypto = require('crypto')
  const apiKey = process.env.DROPBOX_SIGN_API_KEY ?? ''
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(payload)
    .digest('hex')
  return expected === receivedHash
}

// ─── Map Dropbox Sign event to our status ─────────────────────────────────────

export function mapEventToStatus(eventType: string): string | null {
  const map: Record<string, string> = {
    'signature_request_sent':            'out_for_signature',
    'signature_request_viewed':          'out_for_signature',
    'signature_request_signed':          'out_for_signature', // may still need guardian
    'signature_request_all_signed':      'signed',
    'signature_request_declined':        'declined',
    'signature_request_expired':         'expired',
    'signature_request_canceled':        'cancelled',
    'signature_request_remind':          'out_for_signature',
  }
  return map[eventType] ?? null
}
