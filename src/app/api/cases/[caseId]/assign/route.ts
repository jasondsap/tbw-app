import { NextRequest, NextResponse } from 'next/server'
import { assignCaseToAdvocate, createNotification, writeAuditLog } from '@/lib/db/queries'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  try {
    const authUser = await getApiUser(req)
    if (!authUser) return unauthorized()

    const body = await req.json()
    const { advocateId, notifyAdvocate = true } = body

    // The signed-in coordinator owns the assignment.
    const coordinatorId = authUser.dbId

    const updatedCase = await assignCaseToAdvocate(
      caseId,
      advocateId,
      coordinatorId,
      coordinatorId
    )

    // Fetch learner name for the notification
    const caseRows = await sql`
      SELECT c.case_number, p.first_name, p.last_name
      FROM cases c
      JOIN participants p ON p.id = c.participant_id
      WHERE c.id = ${caseId}
    `
    const caseInfo = caseRows[0]

    if (notifyAdvocate && caseInfo) {
      await createNotification({
        userId:   advocateId,
        caseId:   caseId,
        type:     'case_assigned',
        title:    `New case assigned: ${caseInfo.first_name} ${caseInfo.last_name}`,
        body:     `You have been assigned case ${caseInfo.case_number}. Please make initial contact within 2–3 business days.`,
        priority: 2,
      })
    }

    await writeAuditLog({
      userId:       coordinatorId,
      action:       'assign',
      resourceType: 'case',
      resourceId:   caseId,
      newValues:    { advocateId, status: 'assigned' },
      ipAddress:    req.headers.get('x-forwarded-for') ?? undefined,
    })

    return NextResponse.json(updatedCase)
  } catch (err) {
    console.error('Error assigning case:', err)
    return NextResponse.json({ error: 'Failed to assign case' }, { status: 500 })
  }
}
