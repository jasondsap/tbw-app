import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { rawInput, noteType, goals } = await req.json()

    if (!rawInput?.trim()) {
      return NextResponse.json({ error: 'rawInput is required' }, { status: 400 })
    }

    const activeGoals = (goals ?? [])
      .filter((g: any) => g.status !== 'completed' && g.status !== 'discontinued')
      .map((g: any) => `- ${g.title} (${g.category ?? 'General'}, ${g.progress_pct}% progress)`)
      .join('\n')

    const prompt = `You are an education advocate case note writer for The Book Works, a Louisville nonprofit.
Write a structured case note based on the advocate's raw notes below.

Note type: ${noteType}
Current goals:
${activeGoals || '(No active goals yet)'}

Advocate's raw notes:
"""
${rawInput}
"""

Return ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "strengths": "Observed strengths of the learner or caregiver (1-3 sentences)",
  "goals": "Goals that were discussed or worked on this interaction (1-3 sentences)",
  "barriers": "Challenges or barriers identified (1-3 sentences, or null if none noted)",
  "nextSteps": "Immediate next steps to take (1-2 sentences, action-oriented)",
  "fullNote": "Complete professional case note narrative (3-5 sentences, trauma-informed, strengths-based, third-person)"
}

Write in a warm, professional, strengths-based tone. The full note should read as a complete narrative that a supervisor or future advocate could understand.`

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
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI draft-note error:', err)
    return NextResponse.json({ error: 'Failed to generate note' }, { status: 500 })
  }
}
