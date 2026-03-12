import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'
import { BUCKET } from '@/lib/storage/s3'

// ─── GET — list documents for a case ──────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const docs = await sql`
      SELECT
        d.id, d.file_name, d.file_size, d.mime_type,
        d.s3_key, d.doc_type, d.created_at,
        u.first_name || ' ' || u.last_name AS uploaded_by_name
      FROM case_documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE d.case_id = ${caseId}
        AND d.deleted_at IS NULL
      ORDER BY d.created_at DESC
    `
    return NextResponse.json(docs)
  } catch (err: any) {
    console.error('List documents error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST — record a completed S3 upload ──────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const { fileName, fileSize, mimeType, s3Key, docType } = await req.json()

    if (!fileName || !s3Key) {
      return NextResponse.json({ error: 'fileName and s3Key required' }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO case_documents (
        case_id, uploaded_by, file_name, file_size,
        mime_type, s3_key, s3_bucket, doc_type
      ) VALUES (
        ${caseId}, ${user.dbId}, ${fileName}, ${fileSize ?? null},
        ${mimeType ?? null}, ${s3Key}, ${BUCKET}, ${docType ?? 'other'}
      )
      RETURNING id, file_name, doc_type, created_at
    `

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    console.error('Record upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
