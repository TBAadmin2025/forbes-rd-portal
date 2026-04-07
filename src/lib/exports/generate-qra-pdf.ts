import { styles } from '@/lib/exports/pdf-styles'

export async function generateQRAPDF(
  submission: Record<string, unknown>,
  activities: Array<Record<string, unknown>>
): Promise<Buffer> {
  const React = (await import('react')).default
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { Document: PDFDocument, Page, Text, View } = await import('@react-pdf/renderer')

  const h = React.createElement

  const field = (label: string, value: unknown) => {
    const text = String(value || '—')
    return h(View, { style: { marginBottom: 10 } },
      h(Text, { style: { fontSize: 9, fontWeight: 'bold', color: '#7A7060', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1.5 } }, label),
      h(Text, { style: { fontSize: 10, color: '#111111', lineHeight: 1.6 } }, text),
    )
  }

  function footer(pageNum: number) {
    return h(View, { style: styles.footer },
      h(Text, null, 'Forbes Management | admin@forbesmgt.com | Confidential'),
      h(Text, null, String(pageNum)),
    )
  }

  const companyName = String(submission.company_name || '—')
  const entityType = submission.entity_type ? String(submission.entity_type) : null
  const election280c = submission.section_280c_election
  const taxYearsCovered = '2022–2025'

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // --- Page 1: Cover ---
  const coverPage = h(Page, { size: 'LETTER', style: styles.page },
    h(Text, { style: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#7A7060', marginBottom: 12 } }, 'FORBES MANAGEMENT'),
    h(Text, { style: styles.coverTitle }, 'Qualified Research Activity Report'),
    h(View, { style: styles.coverRule }),
    h(Text, { style: styles.coverCompany }, companyName),
    ...(entityType
      ? [h(Text, { style: styles.coverMeta }, entityType)]
      : []),
    ...(election280c !== null && election280c !== undefined
      ? [h(Text, { style: styles.coverMeta }, `§280C(c)(3) Election: ${election280c ? 'Yes' : 'No'}`)]
      : []),
    h(Text, { style: styles.coverMeta }, `Tax Years Covered: ${taxYearsCovered}`),
    h(Text, { style: { ...styles.coverMeta, marginTop: 12 } }, 'Prepared by Forbes Management'),
    h(Text, { style: styles.coverMeta }, date),
    footer(1),
  )

  if (!activities || activities.length === 0) {
    const emptyPage = h(Page, { size: 'LETTER', style: styles.page },
      h(Text, { style: { fontSize: 12, color: '#7A7060', marginTop: 40 } },
        'No QRA activities have been documented for this submission.',
      ),
      footer(2),
    )

    const doc = h(PDFDocument, null, coverPage, emptyPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  }

  // Sort by project number
  const sorted = [...activities].sort(
    (a, b) => (Number(a.project_number) || 0) - (Number(b.project_number) || 0),
  )

  // --- Activity pages ---
  const activityPages = sorted.map((activity, idx) => {
    const children: ReturnType<typeof h>[] = []

    if (idx > 0) {
      children.push(
        h(View, { style: { height: 1, backgroundColor: '#E4D9C6', marginBottom: 20 } }),
      )
    }

    const projectNum = activity.project_number ? `${activity.project_number}. ` : ''
    children.push(
      h(Text, { style: styles.sectionTitle },
        `${projectNum}${String(activity.name || `Project ${idx + 1}`)}`,
      ),
    )

    children.push(field('Description', activity.description))
    children.push(field('Technical Uncertainty', activity.technical_uncertainty))
    children.push(field('Experimentation', activity.experimentation))
    children.push(field('Outcomes', activity.outcomes))

    children.push(footer(idx + 2))

    return h(Page, { size: 'LETTER', style: styles.page, key: `activity-${idx}` }, ...children)
  })

  const doc = h(PDFDocument, null, coverPage, ...activityPages)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any)
  return Buffer.from(buffer)
}
