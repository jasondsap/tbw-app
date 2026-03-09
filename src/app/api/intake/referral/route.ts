import { NextRequest, NextResponse } from 'next/server'
import { createParticipant, createCase, writeAuditLog, getUsersByRole } from '@/lib/db/queries'
import { getApiUser } from '@/lib/auth/api-auth'
import { sendEmail } from '@/lib/email'
import { buildIntakeThankYouEmail, buildStaffIntakeNotifyEmail } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const authUser = await getApiUser(req)
    const createdBy = authUser?.dbId ?? body.intakeSpecialistId ?? 'system'
    const intakeSpecialistName = authUser
      ? `${authUser.firstName} ${authUser.lastName}`
      : 'The Book Works Team'
    const intakeSpecialistEmail = authUser?.email

    // 1. Create participant
    const participant = await createParticipant({
      firstName:          body.firstName,
      lastName:           body.lastName,
      preferredName:      body.preferredName || null,
      pronouns:           body.pronouns || null,
      dateOfBirth:        body.dateOfBirth || null,
      phonePrimary:       body.phonePrimary || null,
      phoneSecondary:     body.phoneSecondary || null,
      email:              body.email || null,
      addressStreet:      body.addressStreet || null,
      addressCity:        body.addressCity || null,
      addressZip:         body.addressZip || null,
      neighborhood:       body.neighborhood || null,
      referralSource:     body.referralSource || null,
      referralDate:       new Date().toISOString().split('T')[0],
      howHeard:           body.howHeard || null,
      currentSchool:      body.currentSchool || null,
      currentGrade:       body.currentGrade || null,
      highestEdCompleted: body.highestEdCompleted || null,
      createdBy,
    })

    if (!participant) {
      return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 })
    }

    // 2. Create case
    const newCase = await createCase({
      participantId:      participant.id,
      intakeSpecialistId: body.intakeSpecialistId || createdBy,
      referralDate:       new Date().toISOString().split('T')[0],
      referralSource:     body.referralSource || null,
      createdBy,
    })

    if (!newCase) {
      return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
    }

    // 3. Audit log
    await writeAuditLog({
      userId:       createdBy,
      action:       'create',
      resourceType: 'case',
      resourceId:   newCase.id,
      newValues:    { caseNumber: newCase.case_number, participantId: participant.id },
      ipAddress:    req.headers.get('x-forwarded-for') ?? undefined,
    })

    // 4. Send emails (non-blocking)
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`

    // Participant thank-you (only if they have an email)
    if (participant.email) {
      sendEmail({
        to:      participant.email,
        subject: `Welcome to The Book Works – Case ${newCase.case_number}`,
        html:    buildIntakeThankYouEmail({
          participantFirstName: participant.first_name,
          caseNumber:           newCase.case_number,
          intakeSpecialistName,
          intakeSpecialistEmail,
        }),
        replyTo: intakeSpecialistEmail,
      }).then(r => {
        if (r.success) console.log('Participant email sent:', r.id)
        else console.error('Participant email failed:', r.error)
      })
    }

    // Staff notification to coordinators + intake specialist
    getUsersByRole('education_coordinator').then(async (coordinators: any[]) => {
      const addresses = coordinators.map((u: any) => u.email).filter(Boolean)
      if (intakeSpecialistEmail && !addresses.includes(intakeSpecialistEmail)) {
        addresses.push(intakeSpecialistEmail)
      }
      if (addresses.length === 0) return

      const result = await sendEmail({
        to:      addresses,
        subject: `New Referral: ${participant.first_name} ${participant.last_name} – ${newCase.case_number}`,
        html:    buildStaffIntakeNotifyEmail({
          participantFirstName: participant.first_name,
          participantLastName:  participant.last_name,
          participantEmail:     participant.email,
          participantPhone:     participant.phone_primary,
          currentSchool:        participant.current_school,
          currentGrade:         participant.current_grade,
          referralSource:       body.referralSource,
          caseNumber:           newCase.case_number,
          caseId:               newCase.id,
          intakeSpecialistName,
          appBaseUrl,
        }),
      })
      if (result.success) console.log('Staff notification sent:', result.id)
      else console.error('Staff notification failed:', result.error)
    }).catch((err: any) => console.error('Staff email error:', err))

    return NextResponse.json({
      caseId:        newCase.id,
      caseNumber:    newCase.case_number,
      participantId: participant.id,
      emailSent:     !!participant.email,
    })

  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
