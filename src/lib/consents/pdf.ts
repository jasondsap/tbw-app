import jsPDF from 'jspdf'
import { createHash } from 'node:crypto'

// One screen worth of rendered output. The flow component records the user's
// answer per screen; we serialize the screen prompt + the resolved answer text
// into the PDF in display order.
export interface ConsentPdfScreen {
  displayOrder: number
  prompt:       string
  // null/undefined → "This question was skipped"
  answerText:   string | null | undefined
}

export interface ConsentPdfInput {
  documentName:      string            // "TBW Consent to Participate v8.2025"
  completedDate:     Date
  participantName:   string
  participantDob:    Date | null
  signedName:        string            // typed-name signature
  signedAt:          Date
  signedIp:          string | null
  screens:           ConsentPdfScreen[]
  // 'signed' renders every screen. 'declined' renders up to and including the
  // screen the participant declined at, then a terminating notice.
  outcome?:          'signed' | 'declined'
}

export interface ConsentPdfResult {
  bytes:   Buffer
  sha256:  string
}

export function formatDateForPdf(value: Date | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  let d: Date
  if (value instanceof Date) {
    d = value
  } else {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (ymd) {
      d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    } else {
      d = new Date(value)
    }
  }
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

export function generateConsentPDF(input: ConsentPdfInput): ConsentPdfResult {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 48
  const usableW = pageW - marginX * 2

  const footerH = 56
  const headerY = 56
  const bodyStartY = 120
  const bodyStartYContd = 56

  const dobStr = formatDateForPdf(input.participantDob)
  const outcome = input.outcome ?? 'signed'

  // Header (first page only)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(input.documentName, marginX, headerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Date completed: ${formatDateForPdf(input.completedDate)}`,
    marginX,
    headerY + 20
  )
  doc.text(`Participant: ${input.participantName}`, marginX, headerY + 36)

  // Body
  let y = bodyStartY

  const ensureRoom = (needed: number) => {
    if (y + needed > pageH - footerH) {
      doc.addPage()
      y = bodyStartYContd
    }
  }

  const drawWrapped = (text: string, opts: { bold?: boolean; size?: number; color?: number }) => {
    const size = opts.size ?? 10
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    if (opts.color !== undefined) doc.setTextColor(opts.color)
    const lines = doc.splitTextToSize(text, usableW) as string[]
    const lineH = size * 1.3
    for (const line of lines) {
      ensureRoom(lineH)
      doc.text(line, marginX, y)
      y += lineH
    }
    if (opts.color !== undefined) doc.setTextColor(0)
  }

  const drawSeparator = () => {
    ensureRoom(12)
    doc.setDrawColor(220)
    doc.line(marginX, y, marginX + usableW, y)
    doc.setDrawColor(0)
    y += 10
  }

  const sorted = [...input.screens].sort((a, b) => a.displayOrder - b.displayOrder)
  for (const s of sorted) {
    drawWrapped(s.prompt, { bold: false, size: 10 })
    const answer =
      s.answerText === null || s.answerText === undefined || s.answerText === ''
        ? 'This question was skipped'
        : s.answerText
    y += 2
    drawWrapped(answer, { bold: true, size: 10 })
    y += 4
    drawSeparator()
    y += 4
  }

  if (outcome === 'declined') {
    drawWrapped('DECLINED at this point. Process terminated.', { bold: true, size: 11 })
    y += 4
    drawSeparator()
  } else {
    // Signature block
    ensureRoom(60)
    y += 12
    drawWrapped('Signature', { bold: true, size: 11 })
    y += 2
    drawWrapped(`Signed by: ${input.signedName}`, { bold: false, size: 10 })
    drawWrapped(`Signed at: ${input.signedAt.toLocaleString()}`, { bold: false, size: 10 })
    if (input.signedIp) {
      drawWrapped(`IP address: ${input.signedIp}`, { bold: false, size: 9, color: 120 })
    }
  }

  // Footer on every page (drawn after body so page count is known)
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    const footerY = pageH - 28
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(110)
    const confidential = 'Confidential — The Book Works'
    const cw = doc.getTextWidth(confidential)
    doc.text(confidential, (pageW - cw) / 2, footerY - 12)

    doc.text(`Participant: ${input.participantName}`, marginX, footerY)
    const dobLabel = dobStr ? `DOB: ${dobStr}` : ''
    if (dobLabel) {
      const dobW = doc.getTextWidth(dobLabel)
      doc.text(dobLabel, (pageW - dobW) / 2, footerY)
    }
    const pageLabel = `Page ${p} of ${total}`
    const pw = doc.getTextWidth(pageLabel)
    doc.text(pageLabel, pageW - marginX - pw, footerY)
    doc.setTextColor(0)
  }

  const ab = doc.output('arraybuffer') as ArrayBuffer
  const bytes = Buffer.from(ab)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  return { bytes, sha256 }
}
