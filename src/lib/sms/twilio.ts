import twilio, { Twilio } from 'twilio'

let _client: Twilio | null = null

function getClient(): Twilio {
  if (_client) return _client
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set')
  }
  _client = twilio(sid, token)
  return _client
}

// Normalize a US phone number to E.164. Returns null if the input can't be
// confidently coerced — caller must treat that as a validation failure rather
// than silently sending to a wrong number.
export function normalizeUsPhoneE164(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (input.trim().startsWith('+') && digits.length >= 11) return `+${digits}`
  return null
}

export interface SendSmsParams {
  to: string                      // E.164
  body: string
  messagingServiceSid?: string
  statusCallback?: string
}

export interface SendSmsResult {
  sid: string
  status: string
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const messagingServiceSid =
    params.messagingServiceSid ?? process.env.TWILIO_MESSAGING_SERVICE_SID
  if (!messagingServiceSid) {
    throw new Error('TWILIO_MESSAGING_SERVICE_SID must be set')
  }

  const client = getClient()
  const message = await client.messages.create({
    to: params.to,
    body: params.body,
    messagingServiceSid,
    ...(params.statusCallback ? { statusCallback: params.statusCallback } : {}),
  })

  return { sid: message.sid, status: message.status }
}

// Validate an incoming Twilio webhook request. Twilio signs every webhook with
// HMAC-SHA1 using your auth token; reject anything that doesn't validate.
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) {
    throw new Error('TWILIO_AUTH_TOKEN must be set for webhook validation')
  }
  return twilio.validateRequest(token, signature, url, params)
}
