// src/app/api/goals/[goalId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateGoalProgress } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const body = await req.json()
    const goal = await updateGoalProgress(
      goalId,
      body.progressPct,
      body.status,
      body.outcomeNotes ?? undefined
    )
    return NextResponse.json(goal)
  } catch (err) {
    console.error('PATCH /api/goals/[goalId] error:', err)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}
