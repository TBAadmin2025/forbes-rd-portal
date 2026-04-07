import * as XLSX from 'xlsx'
import {
  calcConservativeFederal,
  calcASCFederal,
  calcPrior3YrAvg,
} from '@/lib/utils/calculations'

interface ExcelInput {
  submission: Record<string, unknown>
  employees: Record<string, unknown>[]
  supplies: Record<string, unknown>[]
  summaries: Record<string, unknown>[]
  qreByYear: Record<number, number>
  totalQRE: number
  grossReceipts?: Record<string, unknown>[]
  qraActivities?: Record<string, unknown>[]
  filingHistory?: Record<string, unknown>[]
}

export function generateExcel({ submission, employees, supplies, summaries, qreByYear, totalQRE, grossReceipts = [], qraActivities = [], filingHistory = [] }: ExcelInput): Buffer {
  // Tax window — derive from this submission's tax_years
  const taxYears = ((submission.tax_years as number[]) || []).slice().sort((a, b) => a - b)
  const currentYear = taxYears.length > 0 ? taxYears[taxYears.length - 1] : new Date().getFullYear() - 1
  const wb = XLSX.utils.book_new()

  const headerStyle = {
    fill: { fgColor: { rgb: '6C161C' } },
    font: { color: { rgb: 'F0E7D7' }, bold: true },
  }

  // Sheet 1: Summary — federal credits only (state credits computed at preparation)
  const summaryRows = summaries.map((s) => {
    const yr = (s.tax_year as number) || 0
    const tqre = (s.total_qre as number) || 0
    const prior3Avg = calcPrior3YrAvg(qreByYear, yr)
    const conserv = calcConservativeFederal(tqre)
    const asc = calcASCFederal(tqre, prior3Avg)
    return {
      'Company': submission.company_name || '',
      'FEIN': submission.fein || '',
      'State': submission.business_state || '',
      'Contact': submission.contact_name || '',
      'Email': submission.contact_email || '',
      'Tax Year': yr,
      'Payroll QRE': (s.payroll_qre as number) || 0,
      'Supplies QRE': (s.supplies_qre as number) || 0,
      'Total QRE': tqre,
      'Conservative Federal': conserv,
      'Full ASC Federal': asc,
      'Submission Date': submission.submitted_at
        ? new Date(submission.submitted_at as string).toLocaleDateString()
        : '',
    }
  })

  const grandConserv = calcConservativeFederal(totalQRE)
  const grandAsc = calcASCFederal(qreByYear[currentYear] || 0, calcPrior3YrAvg(qreByYear, currentYear))
  summaryRows.push({
    'Company': 'GRAND TOTAL',
    'FEIN': '', 'State': '', 'Contact': '', 'Email': '',
    'Tax Year': 0,
    'Payroll QRE': summaries.reduce((s, r) => s + ((r.payroll_qre as number) || 0), 0),
    'Supplies QRE': summaries.reduce((s, r) => s + ((r.supplies_qre as number) || 0), 0),
    'Total QRE': totalQRE,
    'Conservative Federal': grandConserv,
    'Full ASC Federal': grandAsc,
    'Submission Date': '',
  })

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  const colCount1 = 12
  for (let c = 0; c < colCount1; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws1[addr]) ws1[addr].s = headerStyle
  }
  ws1['!cols'] = Array.from({ length: colCount1 }, () => ({ wch: 16 }))
  ws1['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length, c: colCount1 - 1 } }) }
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

  // Sheet 2: Employee Data
  const empRows = employees.map((e) => {
    const activityNames = (e.activity_names as string[] | undefined) || []
    return {
      'Company': submission.company_name || '',
      'FEIN': submission.fein || '',
      'State': submission.business_state || '',
      'Tax Year': e.tax_year,
      'Employee Name': e.full_name,
      'Type': e.employee_type,
      'Employee State': e.state,
      'Total Wages': e.total_wages,
      'Total Hours Worked': (e.total_hours_worked as number) || 0,
      '% R&D': (e.rd_percentage as number) || 0,
      'R&D Hours': (e.rd_hours as number) || 0,
      'Qualified Amount': (e.qualified_amount as number) || 0,
      'QRA Activities': activityNames.length > 0 ? activityNames.join('; ') : (e.project_name || ''),
      'AI Extracted': e.ai_extracted ? 'Yes' : 'No',
    }
  })

  const ws2 = XLSX.utils.json_to_sheet(empRows.length > 0 ? empRows : [{}])
  const colCount2 = 14
  for (let c = 0; c < colCount2; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws2[addr]) ws2[addr].s = headerStyle
  }
  ws2['!cols'] = Array.from({ length: colCount2 }, () => ({ wch: 16 }))
  ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(empRows.length, 1), c: colCount2 - 1 } }) }
  ws2['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws2, 'Employee Data')

  // Sheet 3: Supplies
  const supRows = supplies.map((s) => ({
    'Company': submission.company_name || '',
    'FEIN': submission.fein || '',
    'Tax Year': s.tax_year,
    'Description': s.description,
    'Vendor': s.vendor || '',
    'QRA Activities': s.project_name || '',
    'Amount': s.amount,
    'AI Extracted': s.ai_extracted ? 'Yes' : 'No',
  }))

  const ws3 = XLSX.utils.json_to_sheet(supRows.length > 0 ? supRows : [{}])
  const colCount3 = 8
  for (let c = 0; c < colCount3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws3[addr]) ws3[addr].s = headerStyle
  }
  ws3['!cols'] = Array.from({ length: colCount3 }, () => ({ wch: 16 }))
  ws3['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(supRows.length, 1), c: colCount3 - 1 } }) }
  ws3['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws3, 'Supplies & Materials')

  // Sheet 4: Discovery Questionnaire
  const yesNo = (v: unknown) => v === true ? 'Yes' : v === false ? 'No' : ''
  const str = (v: unknown) => (v as string) || ''
  const num = (v: unknown) => v != null ? String(v) : ''

  const discoveryRows = [
    // Company info
    { 'Section': 'COMPANY INFORMATION', 'Question': '', 'Answer': '' },
    { 'Section': '', 'Question': 'Legal Business Name', 'Answer': str(submission.company_name) },
    { 'Section': '', 'Question': 'DBA', 'Answer': str(submission.dba_name) },
    { 'Section': '', 'Question': 'Business Address', 'Answer': [str(submission.street_address), str(submission.street_address_2), str(submission.city), str(submission.address_state), str(submission.zip_code)].filter(Boolean).join(', ') },
    { 'Section': '', 'Question': 'Tax Return Address Same?', 'Answer': yesNo(submission.tax_return_address_same) },
    { 'Section': '', 'Question': 'Business Owner Name', 'Answer': str(submission.contact_name) },
    { 'Section': '', 'Question': 'Additional Owners?', 'Answer': yesNo(submission.has_additional_owners) },
    { 'Section': '', 'Question': 'Additional Owner Names', 'Answer': str(submission.additional_owners) },
    { 'Section': '', 'Question': 'Phone Number', 'Answer': str(submission.contact_phone) },
    { 'Section': '', 'Question': 'Business Contact Email', 'Answer': str(submission.contact_email) },
    { 'Section': '', 'Question': 'Industry', 'Answer': str(submission.industry) },
    { 'Section': '', 'Question': 'SIC Code', 'Answer': str(submission.sic_code) },
    { 'Section': '', 'Question': 'Total Number of Employees', 'Answer': num(submission.total_employees) },
    { 'Section': '', 'Question': 'Total Full-Time Employees', 'Answer': num(submission.total_ft_employees) },
    { 'Section': '', 'Question': 'States Employees Located In', 'Answer': str(submission.employee_states) },
    { 'Section': '', 'Question': 'FEIN', 'Answer': str(submission.fein) },
    { 'Section': '', 'Question': 'State Tax ID', 'Answer': str(submission.state_tax_id) },
    { 'Section': '', 'Question': 'Primary State of Operations', 'Answer': str(submission.business_state) },
    { 'Section': '', 'Question': 'Entity Type', 'Answer': str(submission.entity_type) },
    { 'Section': '', 'Question': '§280C(c)(3) Reduced Credit Election', 'Answer': yesNo(submission.section_280c_election) },
    { 'Section': '', 'Question': 'Date Company Incorporated', 'Answer': str(submission.date_incorporated) },
    { 'Section': '', 'Question': 'Tax Year End', 'Answer': str(submission.tax_year_end) },

    // Consultant
    { 'Section': 'FIELD CONSULTANT', 'Question': '', 'Answer': '' },
    { 'Section': '', 'Question': 'Consultant Name', 'Answer': str(submission.field_consultant_name) },
    { 'Section': '', 'Question': 'Consultant Email', 'Answer': str(submission.field_consultant_email) },

    // Filing status — one row per year in this submission's window
    { 'Section': 'TAX FILING INFORMATION', 'Question': '', 'Answer': '' },
    ...taxYears.flatMap((yr) => {
      const rec = filingHistory.find((r) => (r.tax_year as number) === yr)
      return [
        { 'Section': '', 'Question': `${yr} Filing Status`, 'Answer': str(rec?.filing_status) },
        { 'Section': '', 'Question': `Date Filed ${yr} Original Return`, 'Answer': str(rec?.filing_date) },
      ]
    }),
    { 'Section': '', 'Question': 'Computing Credit for Short Year?', 'Answer': yesNo(submission.short_year_credit) },
    { 'Section': '', 'Question': 'Part of a Controlled Group?', 'Answer': yesNo(submission.controlled_group) },
    { 'Section': '', 'Question': 'Tax Years Being Filed For', 'Answer': str(submission.tax_years_filed_for) },

    // Credit method
    { 'Section': 'CREDIT METHOD ELIGIBILITY', 'Question': '', 'Answer': '' },
    { 'Section': '', 'Question': 'Year Started Making Revenue', 'Answer': num(submission.year_started_revenue) },
    { 'Section': '', 'Question': 'Year Started R&D Efforts', 'Answer': num(submission.year_started_rd) },
    { 'Section': '', 'Question': 'Gross Revenue Exceeded $5M?', 'Answer': yesNo(submission.gross_revenue_over_5m) },

    // Contracts
    { 'Section': 'CONTRACTS / RIGHTS', 'Question': '', 'Answer': '' },
    { 'Section': '', 'Question': 'Owns Substantial Rights to R&D Results?', 'Answer': yesNo(submission.owns_substantial_rights) },
    { 'Section': '', 'Question': 'R&D Activities Under Contract?', 'Answer': yesNo(submission.activities_under_contract) },
    { 'Section': '', 'Question': 'Typical Fee Structure', 'Answer': str(submission.contract_fee_structure) },

    // R&D indicators
    { 'Section': 'R&D PROJECT INDICATORS', 'Question': '', 'Answer': '' },
    { 'Section': '', 'Question': 'New processes researched, developed, or implemented?', 'Answer': yesNo(submission.rd_new_processes) },
    { 'Section': '', 'Question': 'Products designed, developed, or improved?', 'Answer': yesNo(submission.rd_products_designed) },
    { 'Section': '', 'Question': 'Tested new materials or concepts?', 'Answer': yesNo(submission.rd_new_materials) },
    { 'Section': '', 'Question': 'Developed or improved formulas or manufacturing methods?', 'Answer': yesNo(submission.rd_formulas_methods) },
    { 'Section': '', 'Question': 'Developed, customized, or updated software technology?', 'Answer': yesNo(submission.rd_software) },
    { 'Section': '', 'Question': 'Developed or improved prototypes or models?', 'Answer': yesNo(submission.rd_prototypes) },
    { 'Section': '', 'Question': 'Developed or improved equipment for new tasks?', 'Answer': yesNo(submission.rd_equipment) },
    { 'Section': '', 'Question': 'Maintained or improved laboratory equipment?', 'Answer': yesNo(submission.rd_lab_equipment) },
    { 'Section': '', 'Question': 'Documented research activities?', 'Answer': yesNo(submission.rd_documented_research) },
    { 'Section': '', 'Question': 'Completed certification testing?', 'Answer': yesNo(submission.rd_certification_testing) },
    { 'Section': '', 'Question': 'Completed environmental upgrades?', 'Answer': yesNo(submission.rd_environmental) },
    { 'Section': '', 'Question': 'Developed or improved acoustical qualities?', 'Answer': yesNo(submission.rd_acoustical) },
    { 'Section': '', 'Question': 'Developed or improved electricity/lighting systems?', 'Answer': yesNo(submission.rd_electrical_lighting) },
    { 'Section': '', 'Question': 'Developed or improved ventilation systems?', 'Answer': yesNo(submission.rd_ventilation) },
    { 'Section': '', 'Question': 'Developed or improved water/plumbing systems?', 'Answer': yesNo(submission.rd_water_plumbing) },
    { 'Section': '', 'Question': 'Developed cybersecurity or anti-terrorism systems?', 'Answer': yesNo(submission.rd_cybersecurity) },
    { 'Section': '', 'Question': 'Developed or improved underground infrastructure?', 'Answer': yesNo(submission.rd_underground_infra) },
    { 'Section': '', 'Question': 'Developed or improved value engineering/construction methods?', 'Answer': yesNo(submission.rd_value_engineering) },
  ]

  const ws4 = XLSX.utils.json_to_sheet(discoveryRows)
  const colCount4 = 3
  for (let c = 0; c < colCount4; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws4[addr]) ws4[addr].s = headerStyle
  }
  ws4['!cols'] = [{ wch: 28 }, { wch: 52 }, { wch: 40 }]
  ws4['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws4, 'Discovery Questionnaire')

  // Sheet 5: Payroll Data Key — employee wages across all tax years side-by-side
  const employeeMap: Record<string, Record<number, number>> = {}

  employees.forEach((e) => {
    const name = (e.full_name as string) || 'Unknown'
    const yr = e.tax_year as number
    const wages = (e.total_wages as number) || 0
    if (!employeeMap[name]) employeeMap[name] = {}
    employeeMap[name][yr] = (employeeMap[name][yr] || 0) + wages
  })

  const payrollRows = Object.entries(employeeMap).map(([name, yearWages]) => {
    const row: Record<string, string | number> = {
      'Employee Name': name,
    }
    taxYears.forEach((yr) => {
      row[`Total Gross Wages ${yr}`] = yearWages[yr] || 0
    })
    return row
  })

  const emptyPayrollRow: Record<string, string | number> = { 'Employee Name': '' }
  taxYears.forEach((yr) => { emptyPayrollRow[`Total Gross Wages ${yr}`] = 0 })

  const ws5 = XLSX.utils.json_to_sheet(payrollRows.length > 0 ? payrollRows : [emptyPayrollRow])

  const payrollColCount = 1 + taxYears.length
  for (let c = 0; c < payrollColCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws5[addr]) ws5[addr].s = headerStyle
  }
  ws5['!cols'] = [{ wch: 30 }, ...taxYears.map(() => ({ wch: 22 }))]
  ws5['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(payrollRows.length, 1), c: payrollColCount - 1 } }) }
  ws5['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws5, 'Payroll Data Key')

  // Sheet 6: Gross Receipts — 4 prior years before earliest tax year through current year
  const earliestTaxYear = taxYears[0] || currentYear
  const grStart = earliestTaxYear - 4
  const grYearList: number[] = []
  for (let y = grStart; y <= currentYear; y++) grYearList.push(y)
  const grRows = grYearList.map((yr) => {
    const receipt = grossReceipts.find((r) => (r.tax_year as number) === yr)
    return {
      'Tax Year': yr,
      'Gross Receipts': receipt ? (receipt.amount as number) || 0 : 0,
    }
  })

  const ws6 = XLSX.utils.json_to_sheet(grRows)
  const grColCount = 2
  for (let c = 0; c < grColCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws6[addr]) ws6[addr].s = headerStyle
  }
  ws6['!cols'] = [{ wch: 12 }, { wch: 20 }]
  ws6['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws6, 'Gross Receipts')

  // Sheet 7: QRA Activities — full narrative export
  const qraRows = [...qraActivities]
    .sort((a, b) => ((a.project_number as number) || 0) - ((b.project_number as number) || 0))
    .map((a) => ({
      'Project #': (a.project_number as number) || '',
      'Project Name': str(a.name),
      'Description': str(a.description),
      'Technical Uncertainty': str(a.technical_uncertainty),
      'Experimentation': str(a.experimentation),
      'Outcomes': str(a.outcomes),
    }))

  const ws7 = XLSX.utils.json_to_sheet(
    qraRows.length > 0
      ? qraRows
      : [{ 'Project #': '', 'Project Name': '', 'Description': '', 'Technical Uncertainty': '', 'Experimentation': '', 'Outcomes': '' }]
  )
  const qraColCount = 6
  for (let c = 0; c < qraColCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws7[addr]) ws7[addr].s = headerStyle
  }
  ws7['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 50 }]
  ws7['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws7, 'QRA Activities')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
