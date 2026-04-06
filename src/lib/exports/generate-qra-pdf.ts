import { styles } from '@/lib/exports/pdf-styles'

export async function generateQRAPDF(
  submission: Record<string, unknown>,
  projects: Array<Record<string, unknown> & { qra_challenges?: Record<string, unknown>[] }>
): Promise<Buffer> {
  const React = (await import('react')).default
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { Document: PDFDocument, Page, Text, View } = await import('@react-pdf/renderer')

  const h = React.createElement

  // Helper: render a labelled field block
  const field = (label: string, value: unknown) => {
    const text = String(value || '—')
    return h(View, { style: { marginBottom: 10 } },
      h(Text, { style: { fontSize: 9, fontWeight: 'bold', color: '#7A7060', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1.5 } }, label),
      h(Text, { style: { fontSize: 10, color: '#111111', lineHeight: 1.6 } }, text),
    )
  }

  // Helper: page footer
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

  // --- No projects fallback ---
  if (!projects || projects.length === 0) {
    const emptyPage = h(Page, { size: 'LETTER', style: styles.page },
      h(Text, { style: { fontSize: 12, color: '#7A7060', marginTop: 40 } },
        'No R&D projects have been documented for this submission.',
      ),
      footer(2),
    )

    const doc = h(PDFDocument, null, coverPage, emptyPage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any)
    return Buffer.from(buffer)
  }

  // --- Project pages ---
  const projectPages = projects.map((project, idx) => {
    const challenges = (project.qra_challenges || []).slice().sort(
      (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
    )

    const startDate = project.start_date ? String(project.start_date) : null
    const endDate = project.end_date ? String(project.end_date) : null
    const dateRange =
      startDate && endDate
        ? `${startDate} — ${endDate}`
        : startDate || endDate || null

    const children: ReturnType<typeof h>[] = []

    // Horizontal rule between projects (not before the first)
    if (idx > 0) {
      children.push(
        h(View, { style: { height: 1, backgroundColor: '#E4D9C6', marginBottom: 20 } }),
      )
    }

    // Project header
    children.push(
      h(Text, { style: styles.sectionTitle }, String(project.name || project.project_name || `Project ${idx + 1}`)),
    )

    if (dateRange) {
      children.push(
        h(Text, { style: { fontSize: 11, color: '#7A7060', marginBottom: 14 } }, dateRange),
      )
    }

    // Field sections
    children.push(field('What was created or improved?', project.description))
    children.push(field('Business Problem', project.business_problem))
    children.push(field('Technologies & Tools', project.technologies_used))
    children.push(field('What Specifically Improved', project.improvements))
    children.push(field('Measurable Outcomes', project.measurable_outcomes))

    // Challenges
    challenges.forEach((challenge, cIdx) => {
      children.push(
        h(Text, { style: { fontSize: 14, fontWeight: 'bold', color: '#111111', marginTop: 16, marginBottom: 10 } },
          `Technical Challenge ${cIdx + 1}`,
        ),
      )
      children.push(field('What was the technical problem?', challenge.technical_problem))
      children.push(field('Why couldn\'t you use an existing solution?', challenge.why_no_existing_solution))
      children.push(field('Approaches & alternatives tried', challenge.approaches_tried))
      children.push(field('Testing methods', challenge.testing_methods))
      children.push(field('Number of iterations', challenge.iteration_count != null ? String(challenge.iteration_count) : '—'))
      children.push(field('Outcome & learnings', challenge.outcome))
    })

    children.push(footer(idx + 2))

    return h(Page, { size: 'LETTER', style: styles.page, key: `project-${idx}` }, ...children)
  })

  const doc = h(PDFDocument, null, coverPage, ...projectPages)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any)
  return Buffer.from(buffer)
}
