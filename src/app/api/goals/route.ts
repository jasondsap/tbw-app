// src/app/api/goals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createGoal } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const body = await req.json()

    const goal = await createGoal({
      caseId:          body.caseId,
      title:           body.title,
      description:     body.description ?? null,
      category:        body.category ?? null,
      targetDate:      body.targetDate ?? null,
      aiGenerated:     body.aiGenerated ?? false,
      aiPromptContext: body.aiPromptContext ?? null,
      createdBy:       authUser.dbId,
    })

    return NextResponse.json(goal)
  } catch (err) {
    console.error('POST /api/goals error:', err)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
