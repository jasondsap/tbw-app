import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { writeAuditLog } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const {
      reason, narrative, meetingHeld, contactAttempts,
      exitDate, goalOutcomes, interview, toolkit, caseNote,
    } = await req.json()

    const userId = authUser.dbId
    const isInfoReferral = reason === 'referred_but_not_enrolled'
    const stablePlannedEnd = new Date(new Date(exitDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)

    // 1. Update all goals
    for (const outcome of goalOutcomes ?? []) {
      await sql`
        UPDATE goals
        SET
          status        = CASE WHEN ${outcome.reached} = true THEN 'completed' ELSE 'not_reached' END,
          end_date      = ${outcome.endDate || exitDate},
          outcome_notes = ${outcome.comments || ''},
          updated_at    = NOW()
        WHERE id = ${outcome.goalId}
      `
    }

    // 2. Create exit case note
    await sql`
      INSERT INTO case_notes (
        case_id, user_id, note_type, note_date,
        contact_method, full_note, created_at
      ) VALUES (
        ${caseId}, ${userId}, 'exit_note',
        ${exitDate}, 'in_person',
        ${caseNote}, NOW()
      )
    `

    // 3. End Education Advocacy service
    // Prefer the canonical narrative chosen by the advocate; fall back to the
    // short reason label if (somehow) the narrative was left blank.
    const reasonLabel =
      reason === 'reached_goals'             ? 'Reached goals' :
      reason === 'stopped_responding'        ? 'Stopped responding' :
      reason === 'requested_exit'            ? 'Requested exit' :
      reason === 'change_in_goals'           ? 'Change in goals' :
      reason === 'referred_but_not_enrolled' ? 'Referred — not enrolled' :
      'Other'
    const outcomeLabel = (narrative && narrative.trim()) || reasonLabel

    await sql`
      UPDATE services
      SET
        status       = 'ended',
        end_date     = ${exitDate},
        outcome      = ${outcomeLabel},
        updated_at   = NOW()
      WHERE case_id      = ${caseId}
        AND service_type = 'education_advocacy'
        AND status       = 'active'
    `

    // 4. Start Stable service — skip for info-and-referral closures since the
    //    learner never enrolled and there are no JCPS records to pull.
    if (!isInfoReferral) {
      await sql`
        INSERT INTO services (
          case_id, service_type, status,
          start_date, planned_end_date, created_at
        ) VALUES (
          ${caseId}, 'stable', 'active',
          ${exitDate}, ${stablePlannedEnd}, NOW()
        )
      `

      // 5. Reassign to Data Specialist
      const dataSpecialists = await sql`
        SELECT id FROM users WHERE user_role = 'data_analyst' LIMIT 1
      `
      const dataSpecialistId = dataSpecialists[0]?.id ?? null
      if (dataSpecialistId) {
        await sql`
          UPDATE cases SET advocate_id = ${dataSpecialistId}, updated_at = NOW()
          WHERE id = ${caseId}
        `
      }
    }

    // 6. Save exit interview
    await sql`
      INSERT INTO exit_interviews (
        case_id, exit_date, exit_reason, meeting_held,
        current_school, current_grade, graduated,
        employed, occupation,
        next_steps, programs_participated,
        positive_changes, satisfaction_rating, how_to_improve,
        raw_interview_data, raw_toolkit_data,
        created_by, created_at
      ) VALUES (
        ${caseId}, ${exitDate}, ${reason},
        ${meetingHeld}, ${interview?.currentSchool ?? ''},
        ${interview?.currentGrade ?? ''}, ${interview?.graduated ?? null},
        ${interview?.employed ?? null}, ${interview?.occupation ?? ''},
        ${JSON.stringify(interview?.nextSteps ?? {})},
        ${JSON.stringify(interview?.programsParticipated ?? [])},
        ${interview?.positiveChanges ?? ''},
        ${interview?.satisfactionRating ?? null},
        ${interview?.howToImprove ?? ''},
        ${JSON.stringify(interview ?? {})},
        ${JSON.stringify(toolkit ?? {})},
        ${userId}, NOW()
      )
    `

    // 7. Save contact attempts (stopped_responding only)
    if (reason === 'stopped_responding' && contactAttempts?.length) {
      for (const attempt of contactAttempts) {
        await sql`
          INSERT INTO contact_attempts (
            case_id, attempt_date, method, notes, created_at
          ) VALUES (
            ${caseId}, ${attempt.date}, ${attempt.method},
            ${attempt.notes ?? ''}, NOW()
          )
        `
      }
    }

    // 8. Update case exit fields
    // - Persist the canonical narrative for funder reporting.
    // - For info-and-referral closures, jump straight to the terminal status
    //   (no Stable phase). Other exits stay 'active' so Stable can run for 30
    //   days before the case is finally closed.
    if (isInfoReferral) {
      await sql`
        UPDATE cases
        SET exit_reason    = ${reason},
            exit_narrative = ${outcomeLabel},
            exit_date      = ${exitDate},
            status         = 'info_referral_closed',
            updated_at     = NOW()
        WHERE id = ${caseId}
      `
    } else {
      await sql`
        UPDATE cases
        SET exit_reason    = ${reason},
            exit_narrative = ${outcomeLabel},
            exit_date      = ${exitDate},
            updated_at     = NOW()
        WHERE id = ${caseId}
      `
    }

    // Audit log
    await writeAuditLog({
      userId,
      action:       'exit',
      resourceType: 'case',
      resourceId:   caseId,
      newValues:    { reason, narrative: outcomeLabel, exitDate, stablePlannedEnd: isInfoReferral ? null : stablePlannedEnd },
      ipAddress:    req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({
      success: true,
      stablePlannedEnd: isInfoReferral ? null : stablePlannedEnd,
    })
  } catch (err) {
    console.error('Exit error:', err)
    return NextResponse.json({ error: 'Failed to finalize exit' }, { status: 500 })
  }
}
