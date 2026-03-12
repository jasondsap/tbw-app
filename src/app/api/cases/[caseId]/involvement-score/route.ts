// src/app/api/cases/[caseId]/involvement-score/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { upsertInvolvementScore } from '@/lib/db/queries'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const body = await req.json()
    // TODO: get real user from Cognito session
    const scoredBy = 'system'

    const score = await upsertInvolvementScore({
      caseId:      caseId,
      scoredBy,
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
