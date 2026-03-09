import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const existing = await sql`
      SELECT id FROM site_sessions
      WHERE site_id = ${params.siteId}
        AND session_date = CURRENT_DATE
      LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json({ session_id: existing[0].id, already_open: true })
    }

    const result = await sql`
      INSERT INTO site_sessions (site_id, opened_by, session_date, opened_at)
      VALUES (${params.siteId}, ${user.dbId}, CURRENT_DATE, NOW())
      RETURNING id
    `
    return NextResponse.json({ session_id: result[0].id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
