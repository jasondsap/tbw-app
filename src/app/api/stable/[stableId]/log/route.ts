import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { stableId: string } }
) {
  try {
    const body = await req.json()
    const userId = 'system' // TODO: real auth

    const {
      pullDate, daysReviewed,
      unexcusedAbsences, excusedAbsences, tardies,
      currentlyEnrolled, notes, outcome, referBackReason,
    } = body

    // Insert attendance log
    await sql`
      INSERT INTO stable_attendance_logs (
        service_id, pull_date, days_reviewed,
        unexcused_absences, excused_absences, tardies,
        currently_enrolled, notes, outcome, refer_back_reason,
        logged_by, logged_at
      ) VALUES (
        ${params.stableId},
        ${pullDate},
        ${daysReviewed},
        ${unexcusedAbsences ?? 0},
        ${excusedAbsences ?? 0},
        ${tardies ?? 0},
        ${currentlyEnrolled},
        ${notes ?? ''},
        ${outcome},
        ${referBackReason ?? ''},
        ${userId},
        NOW()
      )
    `

    // Update service pull status
    const pullStatus = outcome === 'stable' ? 'received' : 'received'
    await sql`
      UPDATE services SET
        status     = ${pullStatus},
        outcome    = ${outcome},
        closed_at  = ${outcome === 'stable' ? new Date().toISOString() : null},
        updated_at = NOW()
      WHERE id = ${params.stableId}
    `

    // If closing as stable, close the case too
    if (outcome === 'stable') {
      await sql`
        UPDATE cases SET
          status = 'closed',
          updated_at  = NOW()
        WHERE id = (SELECT case_id FROM services WHERE id = ${params.stableId})
      `
    }

    // If referring back, create a case note flagging it
    if (outcome === 'refer_back') {
      const caseRow = await sql`
        SELECT case_id FROM services WHERE id = ${params.stableId}
      `
      if (caseRow.length) {
        await sql`
          INSERT INTO case_notes (
            case_id, note_type, content, contact_date,
            created_by, created_at
          ) VALUES (
            ${caseRow[0].case_id},
            'data_review',
            ${'Stable monitoring: Attendance records reviewed. Concerns identified — referred back for advocacy. Reason: ' + (referBackReason ?? '')},
            ${pullDate},
            ${userId},
            NOW()
          )
        `
      }
    }

    return NextResponse.json({ success: true, outcome })
  } catch (err) {
    console.error('Log attendance error:', err)
    return NextResponse.json({ error: 'Failed to log attendance' }, { status: 500 })
  }
}
