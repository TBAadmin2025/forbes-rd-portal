import { styles } from '@/lib/exports/pdf-styles'

const RD_INDICATORS = [
  { key: 'rd_new_processes', label: 'Researched, developed, streamlined, or implemented new processes' },
  { key: 'rd_products_designed', label: 'Products designed, developed, or improved' },
  { key: 'rd_new_materials', label: 'Tested new materials or concepts' },
  { key: 'rd_formulas_methods', label: 'Developed or improved formulas or manufacturing methods' },
  { key: 'rd_software', label: 'Developed, customized, improved, or updated software technology' },
  { key: 'rd_prototypes', label: 'Developed, designed, or improved prototypes or models' },
  { key: 'rd_equipment', label: 'Developed, designed, or improved equipment for material handling or new tasks' },
  { key: 'rd_lab_equipment', label: 'Maintained or improved laboratory equipment' },
  { key: 'rd_documented_research', label: 'Documented research activities' },
  { key: 'rd_certification_testing', label: 'Completed certification testing' },
  { key: 'rd_environmental', label: 'Completed environmental upgrades' },
  { key: 'rd_acoustical', label: 'Developed or improved acoustical qualities' },
  { key: 'rd_electrical_lighting', label: 'Developed or improved alternative electricity or lighting systems' },
  { key: 'rd_ventilation', label: 'Developed or improved ventilation systems' },
  { key: 'rd_water_plumbing', label: 'Developed or improved water/plumbing systems' },
  { key: 'rd_cybersecurity', label: 'Developed systems for cybersecurity or to combat terrorism/criminal activities' },
  { key: 'rd_underground_infra', label: 'Developed or improved electrical underground infrastructure' },
  { key: 'rd_value_engineering', label: 'Developed or improved value engineering, construction, or landscaping methods' },
]

function str(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  return String(val)
}

function yesNo(val: unknown): { text: string; style: (typeof styles)[keyof typeof styles] } {
  if (val === true) return { text: 'Yes', style: styles.indicatorYes }
  if (val === false) return { text: 'No', style: styles.indicatorNo }
  return { text: '—', style: styles.indicatorNa }
}

export async function generateDiscoveryPDF(
  submission: Record<string, unknown>,
  filingHistory: Record<string, unknown>[] = [],
): Promise<Buffer> {
  const taxYears = ((submission.tax_years as number[]) || []).slice().sort((a, b) => a - b)
  const React = (await import('react')).default
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { Document: PDFDocument, Page, Text, View } = await import('@react-pdf/renderer')

  const h = React.createElement

  // Helper: field row
  function fieldRow(label: string, value: string) {
    return h(View, { style: styles.fieldRow },
      h(Text, { style: styles.fieldLabel }, label),
      h(Text, { style: styles.fieldValue }, value),
    )
  }

  // Helper: boolean field row
  function boolFieldRow(label: string, val: unknown) {
    const yn = yesNo(val)
    return h(View, { style: styles.fieldRow },
      h(Text, { style: styles.fieldLabel }, label),
      h(Text, { style: yn.style }, yn.text),
    )
  }

  // Helper: indicator row (for R&D indicators — label is longer)
  function indicatorRow(label: string, val: unknown) {
    const yn = yesNo(val)
    return h(View, { style: styles.fieldRow },
      h(Text, { style: { ...styles.fieldLabel, width: 380 } }, label),
      h(Text, { style: yn.style }, yn.text),
    )
  }

  // Helper: page footer
  function footer(pageNum: number) {
    return h(View, { style: styles.footer },
      h(Text, null, 'Forbes Management | admin@forbesmgt.com | Confidential'),
      h(Text, null, String(pageNum)),
    )
  }

  // Build address string
  const addressParts = [
    str(submission.street_address),
    submission.street_address_2 ? str(submission.street_address_2) : null,
    [str(submission.city), str(submission.address_state), str(submission.zip_code)]
      .filter((p) => p !== '—')
      .join(', '),
  ].filter(Boolean)
  const fullAddress = addressParts.join(', ') || '—'

  // Additional owners
  const additionalOwners =
    submission.has_additional_owners === true
      ? str(submission.additional_owners) || '—'
      : 'None'

  const companyName = str(submission.company_name)
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // --- Page 1: Cover + Company Info ---
  const page1 = h(Page, { size: 'LETTER', style: styles.page },
    // Cover
    h(Text, { style: styles.coverMeta }, 'FORBES MANAGEMENT'),
    h(Text, { style: styles.coverTitle }, 'R&D Tax Credit Discovery Questionnaire'),
    h(Text, { style: styles.coverCompany }, companyName),
    h(Text, { style: styles.coverMeta }, date),
    h(View, { style: styles.coverRule }),

    // Company Information section
    h(Text, { style: styles.sectionTitle }, 'Company Information'),
    fieldRow('Legal Business Name', str(submission.company_name)),
    fieldRow('DBA', str(submission.dba_name)),
    fieldRow('Business Address', fullAddress),
    boolFieldRow('Tax Return Address Same', submission.tax_return_address_same),
    fieldRow('Business Owner', str(submission.contact_name)),
    fieldRow('Additional Owners', additionalOwners),
    fieldRow('Phone', str(submission.contact_phone)),
    fieldRow('Email', str(submission.contact_email)),
    fieldRow('Industry', str(submission.industry)),
    fieldRow('FEIN', str(submission.fein)),
    fieldRow('State Tax ID', str(submission.state_tax_id)),
    fieldRow('Total Employees', str(submission.total_employees)),
    fieldRow('Full-Time Employees', str(submission.total_ft_employees)),
    fieldRow('Employee States', str(submission.employee_states)),
    fieldRow('Date Incorporated', str(submission.date_incorporated)),
    fieldRow('Tax Year End', str(submission.tax_year_end)),

    footer(1),
  )

  // --- Page 2: Tax Filing + Credit Eligibility ---
  const page2 = h(Page, { size: 'LETTER', style: styles.page },
    // Field Consultant
    h(Text, { style: styles.sectionTitle }, 'Field Consultant'),
    fieldRow('Consultant Name', str(submission.field_consultant_name)),
    fieldRow('Consultant Email', str(submission.field_consultant_email)),
    fieldRow('SIC Code', str(submission.sic_code)),

    // Tax Filing Status — one row per year in this submission's window
    h(Text, { style: styles.sectionSubtitle }, 'Tax Filing Status'),
    ...taxYears.flatMap((yr) => {
      const rec = filingHistory.find((r) => (r.tax_year as number) === yr)
      return [
        fieldRow(`${yr} Filing Status`, str(rec?.filing_status)),
        fieldRow(`${yr} Filing Date`, str(rec?.filing_date)),
      ]
    }),

    // Tax Details
    h(Text, { style: styles.sectionSubtitle }, 'Tax Details'),
    boolFieldRow('Short Year Credit', submission.short_year_credit),
    boolFieldRow('Controlled Group', submission.controlled_group),
    fieldRow('Tax Years Filed For', str(submission.tax_years_filed_for)),

    // Credit Method Eligibility
    h(Text, { style: styles.sectionSubtitle }, 'Credit Method Eligibility'),
    fieldRow('Year Started Revenue', str(submission.year_started_revenue)),
    fieldRow('Year Started R&D', str(submission.year_started_rd)),
    boolFieldRow('Gross Revenue Over $5M', submission.gross_revenue_over_5m),

    // Contracts/Rights
    h(Text, { style: styles.sectionSubtitle }, 'Contracts / Rights'),
    boolFieldRow('Owns Substantial Rights', submission.owns_substantial_rights),
    boolFieldRow('Activities Under Contract', submission.activities_under_contract),
    fieldRow('Contract Fee Structure', str(submission.contract_fee_structure)),

    footer(2),
  )

  // --- Page 3: R&D Project Indicators ---
  const page3 = h(Page, { size: 'LETTER', style: styles.page },
    h(Text, { style: styles.sectionTitle }, 'R&D Project Indicators'),
    ...RD_INDICATORS.map((ind) =>
      indicatorRow(ind.label, submission[ind.key]),
    ),
    footer(3),
  )

  const doc = h(PDFDocument, null, page1, page2, page3)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any)
  return Buffer.from(buffer)
}
