import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, unauthorized } from '@/lib/auth/api-auth'
import { buildS3Key, getPresignedUploadUrl, BUCKET } from '@/lib/storage/s3'

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const user = await getApiUser(req)
  if (!user) return unauthorized()

  try {
    const { fileName, mimeType } = await req.json()

    if (!fileName || !mimeType) {
      return NextResponse.json({ error: 'fileName and mimeType required' }, { status: 400 })
    }

    // Only allow safe file types
    const allowed = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const s3Key = buildS3Key(params.caseId, fileName)
    const uploadUrl = await getPresignedUploadUrl(s3Key, mimeType)

    return NextResponse.json({ uploadUrl, s3Key, bucket: BUCKET })
  } catch (err: any) {
    console.error('Presign error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
