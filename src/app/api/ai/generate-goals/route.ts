import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCaseById } from '@/lib/db/queries'
import { sql } from '@/lib/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { caseId } = await req.json()

    // Fetch case + enrollment form data
    const caseData = await getCaseById(caseId)
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch enrollment form if exists
    const enrollRows = await sql`
      SELECT * FROM enrollment_forms WHERE case_id = ${caseId} LIMIT 1
    `
    const enrollment = enrollRows[0] ?? null

    // Build context string for the AI
    const context = [
      `Learner: ${caseData.first_name} ${caseData.last_name}`,
      `Grade: ${caseData.current_grade ?? 'Unknown'}`,
      `School: ${caseData.current_school ?? 'Unknown'}`,
      `Involvement Score: ${caseData.involvement_score ?? 'Not scored'}`,
      `Urgency: ${caseData.urgency ?? 'Unknown'}`,
      `Beginning Education Status: ${caseData.beginning_ed_status ?? 'Not documented'}`,
      enrollment ? `\nEnrollment Form Details:` : '',
      enrollment?.barriers_attendance ? `- Attendance barriers: ${enrollment.barriers_attendance}` : '',
      enrollment?.barriers_behavior   ? `- Behavior/discipline: ${enrollment.barriers_behavior}` : '',
      enrollment?.has_iep             ? `- Has IEP: ${enrollment.has_iep}` : '',
      enrollment?.justice_involved    ? `- Justice involved: ${enrollment.justice_involved}` : '',
      enrollment?.foster_care         ? `- Foster care: ${enrollment.foster_care}` : '',
      enrollment?.multilingual        ? `- Multilingual needs: ${enrollment.multilingual}` : '',
      enrollment?.mental_health_needs ? `- Mental health needs: ${enrollment.mental_health_needs}` : '',
      enrollment?.economic_needs      ? `- Economic needs: ${enrollment.economic_needs}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are an education advocate at The Book Works, a Louisville nonprofit supporting youth education goals.

Based on the learner information below, generate 3-4 specific, achievable education advocacy goals.

Learner Information:
${context}

Return ONLY a JSON array (no markdown, no explanation) of goal objects:
[
  {
    "title": "Short, specific goal title (max 60 chars)",
    "description": "1-2 sentences describing what reaching this goal looks like and why it matters",
    "category": "One of: Attendance, Academics, IEP/504, Enrollment, Credit Recovery, Transfer, Graduation, Post-secondary, Self-advocacy, Other",
    "targetDate": "YYYY-MM-DD approximately 3-6 months from today (${new Date().toISOString().split('T')[0]})"
  }
]

Rules:
- Goals must be specific and measurable (e.g. "Improve attendance to 80%+" not "Improve attendance")
- Prioritize the most urgent needs based on the involvement score and barriers
- Use trauma-informed, strengths-based language
- Keep titles concise and action-oriented
- Maximum 4 goals`

    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    const clean = text.replace(/```json|```/g, '').trim()
    const aiGoals = JSON.parse(clean)

    // Save goals to DB
    const savedGoals = []
    for (const g of aiGoals) {
      const rows = await sql`
        INSERT INTO goals (case_id, title, description, category, target_date, ai_generated, ai_prompt_context, created_by)
        VALUES (${caseId}, ${g.title}, ${g.description}, ${g.category}, ${g.targetDate}, true, ${context}, 'ai')
        RETURNING *
      `
      if (rows[0]) savedGoals.push(rows[0])
    }

    return NextResponse.json({ goals: savedGoals })
  } catch (err) {
    console.error('AI generate-goals error:', err)
    return NextResponse.json({ error: 'Failed to generate goals' }, { status: 500 })
  }
}
