import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_ADDRESS = 'The Book Works <noreply@peersupportstudio.com>'
export const STAFF_INBOX  = 'intake@thebookworks.org' // update when ready

export interface SendResult {
  success: boolean
  id?: string
  error?: string
}

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from:     FROM_ADDRESS,
      to:       Array.isArray(opts.to) ? opts.to : [opts.to],
      subject:  opts.subject,
      html:     opts.html,
      reply_to: opts.replyTo,
    })
    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data?.id }
  } catch (err: any) {
    console.error('Email send failed:', err)
    return { success: false, error: err.message }
  }
}
