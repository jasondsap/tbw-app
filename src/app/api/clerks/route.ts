import { NextRequest, NextResponse } from 'next/server'
import { getRecordsClerkBySchool } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const school = req.nextUrl.searchParams.get('school')
  if (!school) return NextResponse.json(null)
  const clerk = await getRecordsClerkBySchool(school)
  return NextResponse.json(clerk ?? null)
}
