import { jsPDF } from 'jspdf'
import type { Message } from './types'

export function exportChatToPdf(title: string, messages: Message[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeWrapped = (
    text: string,
    opts: { size?: number; style?: 'normal' | 'bold'; color?: [number, number, number]; indent?: number } = {},
  ) => {
    const { size = 10, style = 'normal', color = [30, 41, 59], indent = 0 } = opts
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    const lines = doc.splitTextToSize(text, contentWidth - indent) as string[]
    lines.forEach((line) => {
      ensureSpace(size + 4)
      doc.text(line, margin + indent, y)
      y += size + 4
    })
  }

  // Header
  doc.setFillColor(13, 27, 42)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(45, 212, 191)
  doc.text('Nexus Clinical Pharmacist AI', margin, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text(title, margin, 54)
  doc.text(new Date().toLocaleString(), pageWidth - margin, 54, { align: 'right' })
  y = 100

  messages.forEach((m) => {
    if (m.role === 'user') {
      writeWrapped('CLINICIAN QUERY', { size: 9, style: 'bold', color: [100, 116, 139] })
      y += 2
      writeWrapped(m.content || '(file upload)', { size: 11, color: [15, 23, 42] })
      if (m.attachments?.length) {
        writeWrapped(
          'Attachments: ' + m.attachments.map((a) => a.name).join(', '),
          { size: 9, color: [100, 116, 139] },
        )
      }
      y += 12
      return
    }

    const s = m.structured
    if (!s) {
      writeWrapped(m.content || '', { size: 11 })
      y += 12
      return
    }

    const section = (heading: string, body: () => void) => {
      ensureSpace(28)
      doc.setDrawColor(45, 212, 191)
      doc.setLineWidth(2)
      doc.line(margin, y - 9, margin, y + 2)
      writeWrapped(heading.toUpperCase(), { size: 10, style: 'bold', color: [13, 148, 136], indent: 8 })
      y += 2
      body()
      y += 10
    }

    section('Case Summary', () => writeWrapped(s.caseSummary, { indent: 8 }))
    section('Clinical Assessment', () =>
      s.clinicalAssessment.forEach((i) => writeWrapped('• ' + i, { indent: 8 })),
    )
    section('Drug Related Problems', () =>
      s.drugRelatedProblems.forEach((i) =>
        writeWrapped(`• [${i.severity}] ${i.problem}`, { indent: 8 }),
      ),
    )
    section('Missing Information', () =>
      s.missingInformation.forEach((i) => writeWrapped('• ' + i, { indent: 8 })),
    )
    section('Recommendations', () =>
      s.recommendations.forEach((i, idx) => writeWrapped(`${idx + 1}. ${i}`, { indent: 8 })),
    )
    section('Patient Counseling', () =>
      s.patientCounseling.forEach((i) => writeWrapped('• ' + i, { indent: 8 })),
    )
    section('Confidence Level', () =>
      writeWrapped(s.confidence, { style: 'bold', indent: 8 }),
    )
    y += 8
  })

  // Footer disclaimer on each page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'For clinical decision support only. Verify all recommendations against current guidelines and patient-specific factors.',
      margin,
      pageHeight - 24,
    )
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 24, {
      align: 'right',
    })
  }

  const safeTitle = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`nexus-${safeTitle || 'chat'}.pdf`)
}
