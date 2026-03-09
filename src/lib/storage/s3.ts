import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── Client ────────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region:      process.env.APP_AWS_REGION ?? 'us-east-2',
  credentials: {
    accessKeyId:     process.env.APP_AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY ?? '',
  },
})

const BUCKET = process.env.APP_AWS_S3_BUCKET ?? 'tbw-advocacy-documents'

// ─── Key builder ───────────────────────────────────────────────────────────────

export function buildS3Key(caseId: string, fileName: string): string {
  const timestamp = Date.now()
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `cases/${caseId}/${timestamp}-${safe}`
}

// ─── Presigned upload URL (browser uploads directly to S3) ─────────────────────

export async function getPresignedUploadUrl(
  s3Key: string,
  mimeType: string,
  expiresIn = 300 // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    ContentType: mimeType,
  })
  return getSignedUrl(s3, command, { expiresIn })
}

// ─── Presigned download URL ─────────────────────────────────────────────────────

export async function getPresignedDownloadUrl(
  s3Key: string,
  fileName: string,
  expiresIn = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket:                     BUCKET,
    Key:                        s3Key,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
  })
  return getSignedUrl(s3, command, { expiresIn })
}

// ─── Delete object ──────────────────────────────────────────────────────────────

export async function deleteS3Object(s3Key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }))
}

export { BUCKET }
