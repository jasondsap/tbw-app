import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const rows = await sql`
      SELECT * FROM enrollment_forms
      WHERE case_id = ${caseId}
      ORDER BY created_at DESC LIMIT 1
    `
    return NextResponse.json(rows[0] ?? null)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load enrollment form' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const body = await req.json()
    const userId = 'system' // TODO: real auth

    const {
      participant, education, goals, challenges,
      barriers, resources, meetingDate, meetingType,
      notes, status,
    } = body

    // Upsert enrollment form
    const existing = await sql`
      SELECT id FROM enrollment_forms WHERE case_id = ${caseId} LIMIT 1
    `

    if (existing.length > 0) {
      await sql`
        UPDATE enrollment_forms SET
          participant_data  = ${JSON.stringify(participant)},
          education_data    = ${JSON.stringify(education)},
          goals_data        = ${JSON.stringify(goals)},
          challenges_data   = ${JSON.stringify(challenges)},
          barriers_data     = ${JSON.stringify(barriers)},
          resources_data    = ${JSON.stringify(resources)},
          meeting_date      = ${meetingDate || null},
          meeting_type      = ${meetingType || null},
          advocate_notes    = ${notes || ''},
          status            = ${status},
          updated_at        = NOW()
        WHERE case_id = ${caseId}
      `
    } else {
      await sql`
        INSERT INTO enrollment_forms (
          case_id, participant_data, education_data, goals_data,
          challenges_data, barriers_data, resources_data,
          meeting_date, meeting_type, advocate_notes,
          status, created_by, created_at, updated_at
        ) VALUES (
          ${caseId},
          ${JSON.stringify(participant)},
          ${JSON.stringify(education)},
          ${JSON.stringify(goals)},
          ${JSON.stringify(challenges)},
          ${JSON.stringify(barriers)},
          ${JSON.stringify(resources)},
          ${meetingDate || null},
          ${meetingType || null},
          ${notes || ''},
          ${status},
          ${userId}, NOW(), NOW()
        )
      `
    }

    // If submitting (not just draft), sync key fields back to the case
    if (status === 'submitted') {
      await sql`
        UPDATE cases SET
          current_school      = ${education?.currentSchool || ''},
          current_grade       = ${education?.currentGrade || ''},
          enrolled_at         = ${meetingDate ? new Date(meetingDate).toISOString() : null},
          updated_at          = NOW()
        WHERE id = ${caseId}
      `

      // Update participant preferred name + pronouns if provided
      if (participant?.preferredName || participant?.pronouns) {
        await sql`
          UPDATE participants SET
            preferred_name = COALESCE(NULLIF(${participant?.preferredName || ''}, ''), preferred_name),
            pronouns       = COALESCE(NULLIF(${participant?.pronouns || ''}, ''), pronouns),
            updated_at     = NOW()
          WHERE id = (SELECT participant_id FROM cases WHERE id = ${caseId})
        `
      }
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('Enrollment save error:', err)
    return NextResponse.json({ error: 'Failed to save enrollment form' }, { status: 500 })
  }
}
