import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { writeAuditLog } from '@/lib/db/queries'

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const {
      reason, meetingHeld, contactAttempts,
      exitDate, goalOutcomes, interview, toolkit, caseNote,
    } = await req.json()

    // TODO: get real userId from session
    const userId = 'system'
    const stablePlannedEnd = new Date(new Date(exitDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)

    // ── All actions in a single transaction ──────────────────────────────

    await sql.begin(async sql => {

      // 1. Update all goals
      for (const outcome of goalOutcomes ?? []) {
        await sql`
          UPDATE goals
          SET
            status       = CASE WHEN ${outcome.reached} = true THEN 'completed' ELSE 'not_reached' END,
            end_date     = ${outcome.endDate || exitDate},
            outcome_notes = ${outcome.comments || ''},
            updated_at   = NOW()
          WHERE id = ${outcome.goalId}
        `
      }

      // 2. Create exit case note
      await sql`
        INSERT INTO case_notes (
          case_id, user_id, note_type, note_date,
          contact_method, full_note, created_at
        ) VALUES (
          ${params.caseId}, ${userId}, 'exit_note',
          ${exitDate}, 'in_person',
          ${caseNote}, NOW()
        )
      `

      // 3. End Education Advocacy service
      const outcomeLabel =
        reason === 'reached_goals'     ? 'Reached goals' :
        reason === 'stopped_responding' ? 'Stopped responding' :
        'Requested exit'

      await sql`
        UPDATE services
        SET
          status         = 'ended',
          end_date       = ${exitDate},
          outcome        = ${outcomeLabel},
          updated_at     = NOW()
        WHERE case_id    = ${params.caseId}
          AND service_type = 'education_advocacy'
          AND status     = 'active'
      `

      // 4. Start Stable service
      await sql`
        INSERT INTO services (
          case_id, service_type, status,
          start_date, planned_end_date, created_at
        ) VALUES (
          ${params.caseId}, 'stable', 'active',
          ${exitDate}, ${stablePlannedEnd}, NOW()
        )
      `

      // 5. Reassign to Data Specialist (find user with role data_analyst)
      const dataSpecialists = await sql`
        SELECT id FROM users WHERE user_role = 'data_analyst' LIMIT 1
      `
      const dataSpecialistId = dataSpecialists[0]?.id ?? null

      if (dataSpecialistId) {
        await sql`
          UPDATE cases
          SET advocate_id = ${dataSpecialistId}, updated_at = NOW()
          WHERE id = ${params.caseId}
        `
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
          ${params.caseId}, ${exitDate}, ${reason},
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

      // 7. Save contact attempts (if stopped_responding)
      if (reason === 'stopped_responding' && contactAttempts?.length) {
        for (const attempt of contactAttempts) {
          await sql`
            INSERT INTO contact_attempts (
              case_id, attempt_date, method, notes, created_at
            ) VALUES (
              ${params.caseId}, ${attempt.date}, ${attempt.method},
              ${attempt.notes ?? ''}, NOW()
            )
          `
        }
      }

      // 8. Update case status (keep active, add exit_initiated flag)
      await sql`
        UPDATE cases
        SET
          exit_reason   = ${reason},
          exit_date     = ${exitDate},
          updated_at    = NOW()
        WHERE id = ${params.caseId}
      `
    })

    // ── Audit log (outside transaction) ──────────────────────────────────
    await writeAuditLog({
      userId,
      action:       'exit',
      resourceType: 'case',
      resourceId:   params.caseId,
      newValues:    { reason, exitDate, stablePlannedEnd },
      ipAddress:    req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json({ success: true, stablePlannedEnd })
  } catch (err) {
    console.error('Exit error:', err)
    return NextResponse.json({ error: 'Failed to finalize exit' }, { status: 500 })
  }
}
