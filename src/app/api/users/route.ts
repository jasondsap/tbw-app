import { NextRequest, NextResponse } from 'next/server'
import { getUsersByRole } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get('role')
  if (!role) {
    return NextResponse.json({ error: 'role query param is required' }, { status: 400 })
  }
  try {
    const rows = await getUsersByRole(role)
    const users = (rows as any[]).map(u => ({
      id:        u.id,
      firstName: u.first_name,
      lastName:  u.last_name,
      email:     u.email,
    }))
    return NextResponse.json(users)
  } catch (err) {
    console.error('GET /api/users error:', err)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
