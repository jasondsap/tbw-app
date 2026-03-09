// src/app/api/case-notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCaseNote, writeAuditLog } from '@/lib/db/queries'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // TODO: get real authorId from Cognito session
    const authorId = body.authorId ?? 'system'

    const note = await createCaseNote({
      caseId:          body.caseId,
      noteType:        body.noteType,
      interactionDate: body.interactionDate,
      contactMethod:   body.contactMethod ?? null,
      strengths:       body.strengths ?? null,
      goalsDiscussed:  body.goalsDiscussed ?? null,
      barriers:        body.barriers ?? null,
      nextSteps:       body.nextSteps ?? null,
      fullNote:        body.fullNote,
      aiDrafted:       body.aiDrafted ?? false,
      aiRawInput:      body.aiRawInput ?? null,
      goalIds:         body.goalIds ?? null,
      authorId,
    })

    await writeAuditLog({
      userId: authorId, action: 'create',
      resourceType: 'case_note', resourceId: note?.id,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(note)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}
