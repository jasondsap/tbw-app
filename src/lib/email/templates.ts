// ─── Shared styles ────────────────────────────────────────────────────────────

const base = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f8fafc;
  margin: 0; padding: 0;
`

const card = `
  max-width: 560px; margin: 40px auto; background: #ffffff;
  border-radius: 12px; overflow: hidden;
  border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,.06);
`

const header = `
  background: #0e1e30; padding: 28px 36px;
`

const body = `padding: 32px 36px;`

const footer = `
  background: #f1f5f9; padding: 16px 36px;
  font-size: 12px; color: #94a3b8; text-align: center;
`

const btn = `
  display: inline-block; background: #0d9488; color: #ffffff !important;
  text-decoration: none; font-weight: 600; font-size: 14px;
  padding: 12px 24px; border-radius: 8px; margin-top: 20px;
`

const h1 = `font-size: 20px; font-weight: 700; color: #ffffff; margin: 0;`
const h2 = `font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px;`
const p  = `font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 14px;`
const label = `font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em;`
const value = `font-size: 14px; color: #0f172a; margin: 2px 0 12px;`
const divider = `border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;`

// ─── Participant Thank-You ─────────────────────────────────────────────────────

export interface IntakeThankYouProps {
  participantFirstName: string
  caseNumber: string
  intakeSpecialistName: string
  intakeSpecialistEmail?: string
}

export function buildIntakeThankYouEmail(props: IntakeThankYouProps): string {
  const { participantFirstName, caseNumber, intakeSpecialistName, intakeSpecialistEmail } = props

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${base}">
  <div style="${card}">

    <div style="${header}">
      <p style="${h1}">The Book Works</p>
      <p style="font-size:13px;color:#94a3b8;margin:4px 0 0;">Education Advocacy</p>
    </div>

    <div style="${body}">
      <p style="${h2}">Welcome, ${participantFirstName}! 👋</p>

      <p style="${p}">
        Thank you for reaching out to The Book Works. We've received your referral
        and we're so glad you're here. Our team is dedicated to advocating for
        students and families so every young person can access the education they deserve.
      </p>

      <p style="${p}">
        Your reference number is <strong>${caseNumber}</strong>. 
        Please save this for your records.
      </p>

      <hr style="${divider}">

      <p style="${h2}" style="font-size:16px;">What happens next?</p>

      <p style="${p}">
        <strong>1. Intake conversation</strong><br>
        ${intakeSpecialistName} from our team will be reaching out to you shortly
        to schedule a brief intake conversation. This helps us understand your
        situation and goals so we can match you with the right advocate.
      </p>

      <p style="${p}">
        <strong>2. Consent forms</strong><br>
        Before we can begin working with you, we'll need a few consent forms signed.
        Your intake specialist will send these to you and walk you through each one.
        These allow us to access school records and communicate on your behalf.
      </p>

      <p style="${p}">
        <strong>3. Meet your advocate</strong><br>
        Once consent forms are received, you'll be matched with an Education Advocate
        who will work directly with you to set goals and help you navigate school.
      </p>

      <hr style="${divider}">

      <p style="${p}">
        Have questions in the meantime? You can reply to this email or reach out to
        ${intakeSpecialistEmail
          ? `<a href="mailto:${intakeSpecialistEmail}" style="color:#0d9488;">${intakeSpecialistName}</a>`
          : intakeSpecialistName
        } directly.
      </p>

      <p style="${p}">We're looking forward to working with you!</p>

      <p style="font-size:15px;color:#334155;margin-top:24px;">
        Warmly,<br>
        <strong>The Book Works Education Advocacy Team</strong>
      </p>
    </div>

    <div style="${footer}">
      <p style="margin:0;">
        The Book Works &nbsp;·&nbsp; Louisville, KY<br>
        <a href="https://www.thebookworks.org" style="color:#0d9488;">thebookworks.org</a>
        &nbsp;·&nbsp;
        This email was sent because a referral was submitted on your behalf.
      </p>
    </div>

  </div>
</body>
</html>`
}

// ─── Staff Internal Notification ──────────────────────────────────────────────

export interface IntakeStaffNotifyProps {
  participantFirstName: string
  participantLastName: string
  participantEmail?: string | null
  participantPhone?: string | null
  currentSchool?: string | null
  currentGrade?: string | null
  referralSource?: string | null
  caseNumber: string
  caseId: string
  intakeSpecialistName: string
  appBaseUrl: string
}

export function buildStaffIntakeNotifyEmail(props: IntakeStaffNotifyProps): string {
  const {
    participantFirstName, participantLastName, participantEmail,
    participantPhone, currentSchool, currentGrade,
    referralSource, caseNumber, caseId,
    intakeSpecialistName, appBaseUrl,
  } = props

  const caseUrl = `${appBaseUrl}/cases/${caseId}`

  const row = (lbl: string, val: string | null | undefined) =>
    val ? `<p style="margin:0 0 10px;"><span style="${label}">${lbl}</span><br><span style="${value}">${val}</span></p>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${base}">
  <div style="${card}">

    <div style="${header}">
      <p style="${h1}">New Referral Received</p>
      <p style="font-size:13px;color:#94a3b8;margin:4px 0 0;">Case ${caseNumber}</p>
    </div>

    <div style="${body}">
      <p style="${p}">
        A new referral has been submitted and assigned to
        <strong>${intakeSpecialistName}</strong>.
      </p>

      <hr style="${divider}">

      <p style="${h2}" style="font-size:16px; margin-bottom:12px;">Participant Details</p>

      ${row('Name', `${participantFirstName} ${participantLastName}`)}
      ${row('Email', participantEmail)}
      ${row('Phone', participantPhone)}
      ${row('School', currentSchool)}
      ${row('Grade', currentGrade)}
      ${row('Referral Source', referralSource)}

      <hr style="${divider}">

      <p style="${p}">
        Next step: Contact the participant within <strong>2–3 business days</strong>
        to schedule the intake conversation.
      </p>

      <a href="${caseUrl}" style="${btn}">Open Case in Platform →</a>
    </div>

    <div style="${footer}">
      <p style="margin:0;">
        The Book Works Internal Notification &nbsp;·&nbsp;
        <a href="${appBaseUrl}" style="color:#0d9488;">Open Platform</a>
      </p>
    </div>

  </div>
</body>
</html>`
}
