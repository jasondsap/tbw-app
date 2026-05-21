// src/app/api/case-notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createCaseNote, writeAuditLog } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const body = await req.json()

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
      authorId:        authUser.dbId,
    })

    await writeAuditLog({
      userId: authUser.dbId, action: 'create',
      resourceType: 'case_note', resourceId: note?.id,
      ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(note)
  } catch (err) {
    console.error('POST /api/case-notes error:', err)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}
