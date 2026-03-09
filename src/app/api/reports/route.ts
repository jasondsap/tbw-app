import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/reports?period=thisYear|thisQuarter|thisMonth&year=2025
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'thisYear'
  const year   = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  // Compute date bounds
  const now = new Date()
  let startDate: Date
  let endDate = now

  if (period === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'thisQuarter') {
    const q = Math.floor(now.getMonth() / 3)
    startDate = new Date(now.getFullYear(), q * 3, 1)
  } else {
    // thisYear
    startDate = new Date(year, 0, 1)
    endDate   = new Date(year, 11, 31, 23, 59, 59)
  }

  const start = startDate.toISOString()
  const end   = endDate.toISOString()

  try {
    // ── KPIs ────────────────────────────────────────────────────────
    const [kpiRow] = await sql`
      SELECT
        COUNT(DISTINCT c.participant_id) FILTER (WHERE c.created_at BETWEEN ${start} AND ${end})
          AS learners_served,
        COUNT(*) FILTER (WHERE c.exit_reason = 'reached_goals' AND c.exit_date BETWEEN ${start} AND ${end})
          AS goals_reached,
        COUNT(*) FILTER (WHERE c.exit_date BETWEEN ${start} AND ${end})
          AS total_exited,
        ROUND(AVG(
          CASE WHEN c.exit_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (c.exit_date::date - c.enrolled_at::date)) / 86400
          END
        ))::int AS avg_days_in_service
      FROM cases c
      WHERE c.status IN ('active', 'closed')
    `

    // ── Annual report table ──────────────────────────────────────────
    const annualRows = await sql`
      SELECT
        s.service_type,
        COUNT(DISTINCT s.participant_id)                                                 AS served,
        COUNT(DISTINCT CASE WHEN s.ended_at IS NULL THEN s.participant_id END)          AS open_at_end,
        COUNT(DISTINCT CASE WHEN s.outcome = 'reached_goals' THEN s.participant_id END) AS progress,
        COUNT(DISTINCT CASE WHEN s.ended_at IS NOT NULL
             AND s.outcome != 'reached_goals' THEN s.participant_id END)                AS no_progress
      FROM services s
      WHERE s.started_at BETWEEN ${start} AND ${end}
         OR (s.started_at <= ${end} AND (s.ended_at IS NULL OR s.ended_at >= ${start}))
      GROUP BY s.service_type
    `

    const [unduplicated] = await sql`
      SELECT COUNT(DISTINCT participant_id) AS count
      FROM cases
      WHERE created_at BETWEEN ${start} AND ${end}
    `

    // ── Exits by month ───────────────────────────────────────────────
    const exitsByMonth = await sql`
      SELECT
        TO_CHAR(exit_date, 'Mon') AS month,
        EXTRACT(MONTH FROM exit_date)::int AS month_num,
        COUNT(*) FILTER (WHERE exit_reason = 'reached_goals')      AS reached_goals,
        COUNT(*) FILTER (WHERE exit_reason = 'stopped_responding') AS stopped_responding,
        COUNT(*) FILTER (WHERE exit_reason = 'requested_exit')     AS requested_exit
      FROM cases
      WHERE exit_date BETWEEN ${start} AND ${end}
      GROUP BY month, month_num
      ORDER BY month_num
    `

    // ── Barriers frequency ───────────────────────────────────────────
    // Barriers are stored as JSONB arrays in enrollment_forms
    const topBarriers = await sql`
      SELECT
        barrier_key,
        COUNT(*) AS count
      FROM (
        SELECT jsonb_object_keys(barriers_data) AS barrier_key
        FROM enrollment_forms ef
        JOIN cases c ON c.id = ef.case_id
        WHERE ef.created_at BETWEEN ${start} AND ${end}
      ) sub
      WHERE barrier_key != 'primaryBarrier'
      GROUP BY barrier_key
      ORDER BY count DESC
      LIMIT 10
    `

    // ── Score distribution ───────────────────────────────────────────
    const scoreDist = await sql`
      SELECT involvement_score, COUNT(*) AS count
      FROM cases
      WHERE involvement_score IS NOT NULL
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY involvement_score
      ORDER BY involvement_score
    `

    // ── School distribution ──────────────────────────────────────────
    const schoolDist = await sql`
      SELECT current_school AS school, COUNT(*) AS count
      FROM cases
      WHERE current_school IS NOT NULL
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY current_school
      ORDER BY count DESC
      LIMIT 8
    `

    // ── Grade distribution ───────────────────────────────────────────
    const gradeDist = await sql`
      SELECT current_grade AS grade, COUNT(*) AS count
      FROM cases
      WHERE current_grade IS NOT NULL
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY current_grade
      ORDER BY
        CASE current_grade
          WHEN '6' THEN 1 WHEN '7' THEN 2 WHEN '8' THEN 3
          WHEN '9' THEN 4 WHEN '10' THEN 5 WHEN '11' THEN 6
          WHEN '12' THEN 7 ELSE 8
        END
    `

    // ── Referral sources ─────────────────────────────────────────────
    const referralSources = await sql`
      SELECT referral_source AS source, COUNT(*) AS count
      FROM cases
      WHERE referral_source IS NOT NULL
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY referral_source
      ORDER BY count DESC
    `

    // ── Missing data flags ───────────────────────────────────────────
    const missingData = await sql`
      SELECT
        c.id,
        c.case_number,
        p.first_name || ' ' || p.last_name AS name,
        u.name AS advocate,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN c.involvement_score IS NULL THEN 'No involvement score' END,
          CASE WHEN ef.id IS NULL THEN 'No enrollment form' END,
          CASE WHEN ef.status = 'draft' THEN 'Enrollment form is a draft' END,
          CASE WHEN c.current_school IS NULL THEN 'Missing school info' END,
          CASE WHEN c.exit_date IS NULL AND c.status = 'closed' THEN 'Missing exit date' END,
          CASE WHEN (
            SELECT COUNT(*) FROM goals g WHERE g.case_id = c.id AND g.outcome IS NULL AND g.status = 'completed'
          ) > 0 THEN 'Goals missing outcomes' END,
          CASE WHEN (
            SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = c.id
          ) < NOW() - INTERVAL '14 days' THEN 'No case notes in 14 days' END
        ], NULL) AS issues
      FROM cases c
      JOIN participants p ON p.id = c.participant_id
      LEFT JOIN users u   ON u.id = c.assigned_to
      LEFT JOIN enrollment_forms ef ON ef.case_id = c.id
      WHERE c.status = 'active'
      HAVING array_length(ARRAY_REMOVE(ARRAY[
          CASE WHEN c.involvement_score IS NULL THEN 1 END,
          CASE WHEN ef.id IS NULL THEN 1 END
        ], NULL), 1) > 0
         OR (SELECT MAX(cn.created_at) FROM case_notes cn WHERE cn.case_id = c.id) < NOW() - INTERVAL '14 days'
      ORDER BY array_length(issues, 1) DESC NULLS LAST
      LIMIT 20
    `

    return NextResponse.json({
      period, start, end,
      kpi: {
        learnersServed:     Number(kpiRow?.learners_served ?? 0),
        goalsReached:       Number(kpiRow?.goals_reached ?? 0),
        totalExited:        Number(kpiRow?.total_exited ?? 0),
        avgDaysInService:   Number(kpiRow?.avg_days_in_service ?? 0),
        goalCompletionRate: kpiRow?.total_exited > 0
          ? Math.round((kpiRow.goals_reached / kpiRow.total_exited) * 100) : 0,
      },
      annualTable: {
        year,
        rows:          annualRows,
        unduplicated:  Number(unduplicated?.count ?? 0),
      },
      exitsByMonth,
      topBarriers,
      scoreDist,
      demographics: { schoolDist, gradeDist, referralSources },
      missingData,
    })
  } catch (err) {
    console.error('Reports query error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
