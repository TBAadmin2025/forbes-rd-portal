import { styles, fmt } from '@/lib/exports/pdf-styles'
import {
  calcConservativeFederal,
  calcASCFederal,
  calcPrior3YrAvg,
} from '@/lib/utils/calculations'

export interface SummaryPDFInput {
  submission: Record<string, unknown>
  employees: Record<string, unknown>[]
  supplies: Record<string, unknown>[]
  documents: Record<string, unknown>[]
  summaries: Record<string, unknown>[]
  credits: Record<string, unknown>[]
  qreByYear: Record<number, number>
  totalQRE: number
}

export async function generateSummaryPDF(input: SummaryPDFInput): Promise<Buffer> {
  const { submission, employees, documents, summaries, credits, qreByYear, totalQRE } = input

  const React = (await import('react')).default
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { Document: PDFDocument, Page, Text, View } = await import('@react-pdf/renderer')

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Tax window — derive everything from this submission's tax_years
  const taxYears = (submission.tax_years as number[]) || []
  const currentYear = taxYears.length > 0 ? Math.max(...taxYears) : new Date().getFullYear() - 1
  const years = [...taxYears].sort((a, b) => b - a) // descending for display

  // Credit calculations — prefer DB values, fall back to computed federal-only
  const credit = credits[0] || null
  const grandConserv = calcConservativeFederal(totalQRE)
  const grandAsc = calcASCFederal(qreByYear[currentYear] || 0, calcPrior3YrAvg(qreByYear, currentYear))

  const conservFed = (credit?.conservative_federal as number) ?? grandConserv
  const ascFed = (credit?.asc_federal as number) ?? grandAsc

  // Group employees by year
  const empsByYear: Record<number, Record<string, unknown>[]> = {}
  employees.forEach((e) => {
    const yr = e.tax_year as number
    if (!empsByYear[yr]) empsByYear[yr] = []
    empsByYear[yr].push(e)
  })

  // Group documents by category
  const docsByCategory: Record<string, Record<string, unknown>[]> = {}
  documents.forEach((d) => {
    const cat = d.category as string
    if (!docsByCategory[cat]) docsByCategory[cat] = []
    docsByCategory[cat].push(d)
  })

  const categoryLabels: Record<string, string> = {
    payroll: 'Payroll Reports',
    pandl: 'P&L / Expense Reports',
    taxid: 'FEIN & State Tax ID',
    gross_receipts: 'Gross Receipts',
    other: 'Other Documents',
  }

  const FooterComponent = ({ pageNum }: { pageNum: number }) =>
    React.createElement(
      View,
      { style: styles.footer, fixed: true },
      React.createElement(Text, null, 'Forbes Management | admin@forbesmgt.com | Confidential'),
      React.createElement(Text, null, `Page ${pageNum}`)
    )

  const pdfDoc = React.createElement(
    PDFDocument,
    null,

    // Page 1: Cover
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(
        View,
        { style: { marginTop: 80 } },
        React.createElement(
          Text,
          { style: { fontSize: 12, color: '#7A7060', marginBottom: 30, letterSpacing: 3 } },
          'FORBES MANAGEMENT'
        ),
        React.createElement(Text, { style: styles.coverTitle }, 'R&D Tax Credit Analysis'),
        React.createElement(View, { style: styles.coverRule }),
        React.createElement(
          Text,
          { style: styles.coverCompany },
          (submission.company_name as string) || ''
        ),
        React.createElement(
          Text,
          { style: styles.coverMeta },
          `FEIN: ${(submission.fein as string) || 'N/A'}`
        ),
        React.createElement(Text, { style: styles.coverMeta }, 'Prepared by Forbes Management'),
        React.createElement(Text, { style: styles.coverMeta }, dateStr)
      ),
      React.createElement(FooterComponent, { pageNum: 1 })
    ),

    // Page 2: Credit Summary
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Estimated Credit Summary'),
      React.createElement(
        View,
        { style: styles.calloutBox },
        React.createElement(Text, { style: styles.calloutLabel }, 'TOTAL QUALIFIED RESEARCH EXPENSES'),
        React.createElement(Text, { style: styles.calloutValue }, fmt(totalQRE))
      ),
      // Credit table — federal only; state credits computed at preparation
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Method'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Federal Credit')
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableCell }, 'Conservative (6%)'),
        React.createElement(Text, { style: styles.tableCellRight }, fmt(conservFed))
      ),
      React.createElement(
        View,
        { style: styles.tableRow },
        React.createElement(Text, { style: styles.tableCell }, 'Full ASC (14%)'),
        React.createElement(Text, { style: styles.tableCellRight }, fmt(ascFed))
      ),
      React.createElement(
        Text,
        { style: styles.disclaimer },
        'Federal estimates only. Applicable state R&D credits will be calculated by Forbes during preparation. Final amounts subject to IRS review.'
      ),
      React.createElement(FooterComponent, { pageNum: 2 })
    ),

    // Page 3: QRE by Year
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Qualified Research Expenses by Year'),
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Year'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'People'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'R&D Hours'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Payroll QRE'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Supplies QRE'),
        React.createElement(Text, { style: styles.tableHeaderCell }, 'Total QRE')
      ),
      ...summaries.map((s) =>
        React.createElement(
          View,
          { key: String(s.tax_year), style: styles.tableRow },
          React.createElement(Text, { style: styles.tableCell }, String(s.tax_year || '')),
          React.createElement(
            Text,
            { style: styles.tableCellRight },
            String((s.employee_count as number) || 0)
          ),
          React.createElement(
            Text,
            { style: styles.tableCellRight },
            ((s.total_rd_hours as number) || 0).toLocaleString()
          ),
          React.createElement(
            Text,
            { style: styles.tableCellRight },
            fmt((s.payroll_qre as number) || 0)
          ),
          React.createElement(
            Text,
            { style: styles.tableCellRight },
            fmt((s.supplies_qre as number) || 0)
          ),
          React.createElement(
            Text,
            { style: styles.tableCellRight },
            fmt((s.total_qre as number) || 0)
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.totalRow },
        React.createElement(Text, { style: styles.totalCell }, 'Grand Total'),
        React.createElement(
          Text,
          { style: { ...styles.totalCell, textAlign: 'right' as const } },
          String(
            summaries.reduce(
              (acc: number, r) => acc + ((r.employee_count as number) || 0),
              0
            )
          )
        ),
        React.createElement(
          Text,
          { style: { ...styles.totalCell, textAlign: 'right' as const } },
          summaries
            .reduce((acc: number, r) => acc + ((r.total_rd_hours as number) || 0), 0)
            .toLocaleString()
        ),
        React.createElement(
          Text,
          { style: { ...styles.totalCell, textAlign: 'right' as const } },
          fmt(
            summaries.reduce((acc: number, r) => acc + ((r.payroll_qre as number) || 0), 0)
          )
        ),
        React.createElement(
          Text,
          { style: { ...styles.totalCell, textAlign: 'right' as const } },
          fmt(
            summaries.reduce((acc: number, r) => acc + ((r.supplies_qre as number) || 0), 0)
          )
        ),
        React.createElement(
          Text,
          { style: { ...styles.totalCell, textAlign: 'right' as const } },
          fmt(totalQRE)
        )
      ),
      React.createElement(FooterComponent, { pageNum: 3 })
    ),

    // Page 4: Employee Detail
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Employee & Contractor Detail'),
      ...years.flatMap((yr) => {
        const yrEmps = empsByYear[yr] || []
        if (yrEmps.length === 0) return []
        return [
          React.createElement(Text, { key: `yr-${yr}`, style: styles.yearHeading }, String(yr)),
          React.createElement(
            View,
            { key: `hdr-${yr}`, style: styles.tableHeader },
            React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 2 } }, 'Name'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'Type'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'State'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'Wages'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'Hours'),
            React.createElement(Text, { style: styles.tableHeaderCell }, '% R&D'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'R&D Hrs'),
            React.createElement(Text, { style: styles.tableHeaderCell }, 'Qualified'),
            React.createElement(Text, { style: { ...styles.tableHeaderCell, flex: 2 } }, 'Project')
          ),
          ...yrEmps.map((e) =>
            React.createElement(
              View,
              { key: e.id as string, style: styles.tableRow },
              React.createElement(
                Text,
                { style: { ...styles.tableCell, flex: 2 } },
                e.full_name as string
              ),
              React.createElement(Text, { style: styles.tableCell }, e.employee_type as string),
              React.createElement(Text, { style: styles.tableCell }, e.state as string),
              React.createElement(
                Text,
                { style: styles.tableCellRight },
                fmt(e.total_wages as number)
              ),
              React.createElement(
                Text,
                { style: styles.tableCellRight },
                String((e.total_hours_worked as number) || 0)
              ),
              React.createElement(
                Text,
                { style: styles.tableCellRight },
                `${(e.rd_percentage as number) || 0}%`
              ),
              React.createElement(
                Text,
                { style: styles.tableCellRight },
                String((e.rd_hours as number) || 0)
              ),
              React.createElement(
                Text,
                { style: styles.tableCellRight },
                fmt((e.qualified_amount as number) || 0)
              ),
              React.createElement(
                Text,
                { style: { ...styles.tableCell, flex: 2 } },
                ((e.activity_names as string[] | undefined) || []).join('; ') || (e.project_name as string) || ''
              )
            )
          ),
        ]
      }),
      React.createElement(FooterComponent, { pageNum: 4 })
    ),

    // Page 5: Documents
    React.createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Supporting Documents'),
      ...Object.entries(docsByCategory).flatMap(([cat, catDocs]) => [
        React.createElement(
          Text,
          { key: `cat-${cat}`, style: styles.docCategory },
          categoryLabels[cat] || cat
        ),
        ...catDocs.map((d) =>
          React.createElement(
            Text,
            { key: d.id as string, style: styles.docItem },
            `• ${d.file_name as string}${d.tax_year ? ` (${d.tax_year})` : ''}`
          )
        ),
      ]),
      documents.length === 0 &&
        React.createElement(Text, { style: styles.docItem }, 'No documents uploaded.'),
      React.createElement(FooterComponent, { pageNum: 5 })
    )
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfDoc as any)
  return Buffer.from(buffer)
}
