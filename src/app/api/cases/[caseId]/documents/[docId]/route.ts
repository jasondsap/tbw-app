import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { sql } from '@/lib/db'
import { getPresignedDownloadUrl, deleteS3Object } from '@/lib/storage/s3'

// ─── GET — generate a presigned download URL ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string; docId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const rows = await sql`
      SELECT id, file_name, s3_key, deleted_at
      FROM case_documents
      WHERE id = ${params.docId}
        AND case_id = ${params.caseId}
    `

    const doc = rows[0]
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    if (doc.deleted_at) return NextResponse.json({ error: 'Document deleted' }, { status: 410 })

    const url = await getPresignedDownloadUrl(doc.s3_key, doc.file_name)
    return NextResponse.json({ url, fileName: doc.file_name })
  } catch (err: any) {
    console.error('Download URL error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── DELETE — soft delete a document ─────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { caseId: string; docId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  // Only admins and coordinators can delete
  if (!['admin', 'education_coordinator', 'intake_specialist'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rows = await sql`
      SELECT id, s3_key FROM case_documents
      WHERE id = ${params.docId}
        AND case_id = ${params.caseId}
        AND deleted_at IS NULL
    `

    const doc = rows[0]
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    // Soft delete in DB
    await sql`
      UPDATE case_documents
      SET deleted_at = NOW(), deleted_by = ${user.dbId}
      WHERE id = ${params.docId}
    `

    // Also remove from S3
    try {
      await deleteS3Object(doc.s3_key)
    } catch (s3Err) {
      console.error('S3 delete failed (DB record still soft-deleted):', s3Err)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Delete document error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
