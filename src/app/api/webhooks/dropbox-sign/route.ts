import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { mapEventToStatus } from '@/lib/esign/dropbox-sign'
import { BUCKET } from '@/lib/storage/s3'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region:      process.env.APP_AWS_REGION ?? 'us-east-2',
  credentials: {
    accessKeyId:     process.env.APP_AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY ?? '',
  },
})

// Dropbox Sign requires a 200 with text "Hello API Event Received"
const ACK = new NextResponse('Hello API Event Received', { status: 200 })

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const jsonStr   = formData.get('json') as string | null
    if (!jsonStr) return ACK

    const payload   = JSON.parse(jsonStr)
    const event     = payload.event
    const sigReq    = payload.signature_request

    if (!event || !sigReq) return ACK

    const eventType = event.event_type
    const requestId = sigReq.signature_request_id

    console.log(`Dropbox Sign webhook: ${eventType} for ${requestId}`)

    // Look up our record
    const rows = await sql`
      SELECT id, case_id, doc_type, requires_guardian, status
      FROM signature_requests
      WHERE hellosign_request_id = ${requestId}
    `.catch(() => [])

    if (!rows.length) {
      console.warn('No signature_request found for:', requestId)
      return ACK
    }

    const record   = rows[0]
    const newStatus = mapEventToStatus(eventType)

    // ── Handle individual signer events ────────────────────────────────────

    if (eventType === 'signature_request_signed') {
      // Figure out which signer just signed
      const signatures = sigReq.signatures ?? []

      for (const sig of signatures) {
        if (sig.status_code === 'signed') {
          if (sig.signer_role === 'participant') {
            await sql`
              UPDATE signature_requests
              SET participant_signed_at = NOW(), updated_at = NOW()
              WHERE id = ${record.id} AND participant_signed_at IS NULL
            `.catch(() => null)
          }
          if (sig.signer_role === 'guardian') {
            await sql`
              UPDATE signature_requests
              SET guardian_signed_at = NOW(), updated_at = NOW()
              WHERE id = ${record.id} AND guardian_signed_at IS NULL
            `.catch(() => null)
          }
        }
      }
    }

    // ── Handle fully completed ──────────────────────────────────────────────

    if (eventType === 'signature_request_all_signed') {
      // Download the signed PDF and store in S3
      let signedS3Key: string | null = null

      try {
        const pdfUrl = sigReq.files_url // Dropbox Sign provides this when complete
        if (pdfUrl) {
          const pdfRes  = await fetch(pdfUrl, {
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.DROPBOX_SIGN_API_KEY}:`).toString('base64')}`,
            },
          })

          if (pdfRes.ok) {
            const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
            const timestamp  = Date.now()
            signedS3Key      = `cases/${record.case_id}/signed/${record.doc_type}-signed-${timestamp}.pdf`

            await s3.send(new PutObjectCommand({
              Bucket:      BUCKET,
              Key:         signedS3Key,
              Body:        pdfBuffer,
              ContentType: 'application/pdf',
            }))

            // Also record in case_documents
            await sql`
              INSERT INTO case_documents (
                case_id, file_name, mime_type, s3_key, s3_bucket, doc_type
              ) VALUES (
                ${record.case_id},
                ${`${record.doc_type}-signed.pdf`},
                'application/pdf',
                ${signedS3Key},
                ${BUCKET},
                ${record.doc_type}
              )
              ON CONFLICT (s3_key) DO NOTHING
            `.catch(() => null)
          }
        }
      } catch (pdfErr) {
        console.error('Failed to download/store signed PDF:', pdfErr)
      }

      await sql`
        UPDATE signature_requests
        SET
          status            = 'signed',
          completed_at      = NOW(),
          signed_s3_key     = ${signedS3Key},
          updated_at        = NOW()
        WHERE id = ${record.id}
      `.catch(() => null)

      // Update consent record in case_consents if it exists
      await sql`
        UPDATE case_consents
        SET
          status     = 'signed',
          signed_at  = NOW()
        WHERE case_id = ${record.case_id}
          AND consent_type = ${record.doc_type}
      `.catch(() => null)

      return ACK
    }

    // ── Handle other status changes ─────────────────────────────────────────

    if (newStatus && newStatus !== record.status) {
      await sql`
        UPDATE signature_requests
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${record.id}
      `.catch(() => null)
    }

    return ACK

  } catch (err) {
    console.error('Dropbox Sign webhook error:', err)
    // Always return ACK to prevent Dropbox Sign from retrying endlessly
    return ACK
  }
}
