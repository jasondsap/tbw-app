// src/app/api/cases/[caseId]/involvement-score/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { upsertInvolvementScore } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const body = await req.json()

    const score = await upsertInvolvementScore({
      caseId:      caseId,
      scoredBy:    authUser.dbId,
      urgency:     body.urgency,
      involvement: body.involvement,
      score:       body.score,
      scoreNotes:  body.scoreNotes ?? undefined,
      factors:     body.factors ?? [],
    })

    return NextResponse.json(score)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
