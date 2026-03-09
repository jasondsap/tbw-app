// src/app/api/goals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createGoal } from '@/lib/db/queries'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const createdBy = body.createdBy ?? 'system'

    const goal = await createGoal({
      caseId:          body.caseId,
      title:           body.title,
      description:     body.description ?? null,
      category:        body.category ?? null,
      targetDate:      body.targetDate ?? null,
      aiGenerated:     body.aiGenerated ?? false,
      aiPromptContext: body.aiPromptContext ?? null,
      createdBy,
    })

    return NextResponse.json(goal)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
