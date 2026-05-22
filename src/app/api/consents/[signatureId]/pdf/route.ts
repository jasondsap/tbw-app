import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'
import { getPresignedDownloadUrl } from '@/lib/storage/s3'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ signatureId: string }> }
) {
  const { signatureId } = await params
  const authUser = await getApiUser(req)
  if (!authUser) return unauthorized()

  const rows = await sql`
    SELECT pdf_s3_key, form_type, form_version, outcome
    FROM consent_signatures
    WHERE id = ${signatureId}
    LIMIT 1
  `
  const row = rows[0] as any
  if (!row) {
    return NextResponse.json({ error: 'Signature not found' }, { status: 404 })
  }

  const fileName = `${row.form_type}-${row.outcome}.pdf`
  const url = await getPresignedDownloadUrl(row.pdf_s3_key, fileName, 600)
  return NextResponse.json({ url })
}
