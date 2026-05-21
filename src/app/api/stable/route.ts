import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`
      SELECT
        s.id,
        s.case_id,
        c.case_number,
        c.exit_date,
        c.exit_reason,
        c.exit_narrative,
        s.planned_end_date   AS stable_due_date,
        s.status             AS pull_status,
        s.closed_at,
        s.outcome,
        p.first_name || ' ' || p.last_name  AS participant_name,
        p.pronouns,
        c.current_school     AS school,
        c.current_grade      AS grade,
        COALESCE(fu.name, 'Unknown') AS former_advocate
      FROM services s
      JOIN cases c       ON c.id = s.case_id
      JOIN participants p ON p.id = c.participant_id
      LEFT JOIN users fu  ON fu.id = s.former_advocate_id
      WHERE s.service_type = 'stable'
        AND c.status   = 'active'
      ORDER BY
        CASE WHEN s.closed_at IS NOT NULL THEN 1 ELSE 0 END,
        s.planned_end_date ASC
    `

    // Fetch attendance logs for each service
    const ids = rows.map((r: any) => r.id)
    let logs: any[] = []
    if (ids.length) {
      logs = await sql`
        SELECT * FROM stable_attendance_logs
        WHERE service_id = ANY(${ids})
        ORDER BY logged_at ASC
      `
    }

    const byService: Record<string, any[]> = {}
    for (const log of logs) {
      if (!byService[log.service_id]) byService[log.service_id] = []
      byService[log.service_id].push({
        id:                log.id,
        loggedAt:          log.logged_at,
        loggedBy:          log.logged_by_name ?? 'Jess',
        pullDate:          log.pull_date,
        daysReviewed:      log.days_reviewed,
        unexcusedAbsences: log.unexcused_absences,
        excusedAbsences:   log.excused_absences,
        tardies:           log.tardies,
        currentlyEnrolled: log.currently_enrolled,
        notes:             log.notes ?? '',
        outcome:           log.outcome,
        referBackReason:   log.refer_back_reason ?? '',
      })
    }

    const result = rows.map((r: any) => ({
      id:              r.id,
      caseId:          r.case_id,
      caseNumber:      r.case_number,
      participantName: r.participant_name,
      pronouns:        r.pronouns,
      school:          r.school ?? '',
      grade:           r.grade ?? '',
      exitDate:        r.exit_date,
      stableDueDate:   r.stable_due_date,
      exitReason:      r.exit_reason,
      exitNarrative:   r.exit_narrative ?? null,
      formerAdvocate:  r.former_advocate,
      pullStatus:      r.pull_status ?? 'not_started',
      attendanceLogs:  byService[r.id] ?? [],
      closedAt:        r.closed_at ?? null,
      outcome:         r.outcome ?? null,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('Stable list error:', err)
    return NextResponse.json({ error: 'Failed to load stable cases' }, { status: 500 })
  }
}
