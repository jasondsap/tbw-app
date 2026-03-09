import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string; sessionId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    await sql`
      UPDATE site_sessions
      SET closed_at = NOW(), closed_by = ${user.dbId}
      WHERE id = ${params.sessionId}
        AND site_id = ${params.siteId}
    `
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
