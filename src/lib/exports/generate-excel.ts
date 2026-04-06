import * as XLSX from 'xlsx'
import {
  calcConservativeFederal,
  calcASCFederal,
  calcGeorgiaCredit,
  calcPrior3YrAvg,
} from '@/lib/utils/calculations'

interface ExcelInput {
  submission: Record<string, unknown>
  employees: Record<string, unknown>[]
  supplies: Record<string, unknown>[]
  summaries: Record<string, unknown>[]
  qreByYear: Record<number, number>
  totalQRE: number
}

export function generateExcel({ submission, employees, supplies, summaries, qreByYear, totalQRE }: ExcelInput): Buffer {
  const wb = XLSX.utils.book_new()

  const headerStyle = {
    fill: { fgColor: { rgb: '6C161C' } },
    font: { color: { rgb: 'F0E7D7' }, bold: true },
  }

  // Sheet 1: Summary
  const summaryRows = summaries.map((s) => {
    const yr = (s.tax_year as number) || 0
    const tqre = (s.total_qre as number) || 0
    const prior3Avg = calcPrior3YrAvg(qreByYear, yr)
    const conserv = calcConservativeFederal(tqre)
    const asc = calcASCFederal(tqre, prior3Avg)
    const ga = calcGeorgiaCredit(conserv)
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
      'Georgia Credit': ga,
      'Total Est. Value': conserv + ga,
      'Submission Date': submission.submitted_at
        ? new Date(submission.submitted_at as string).toLocaleDateString()
        : '',
    }
  })

  const grandConserv = calcConservativeFederal(totalQRE)
  const grandAsc = calcASCFederal(qreByYear[2025] || 0, calcPrior3YrAvg(qreByYear, 2025))
  const grandGa = calcGeorgiaCredit(grandConserv)
  summaryRows.push({
    'Company': 'GRAND TOTAL',
    'FEIN': '', 'State': '', 'Contact': '', 'Email': '',
    'Tax Year': 0,
    'Payroll QRE': summaries.reduce((s, r) => s + ((r.payroll_qre as number) || 0), 0),
    'Supplies QRE': summaries.reduce((s, r) => s + ((r.supplies_qre as number) || 0), 0),
    'Total QRE': totalQRE,
    'Conservative Federal': grandConserv,
    'Full ASC Federal': grandAsc,
    'Georgia Credit': grandGa,
    'Total Est. Value': grandConserv + grandGa,
    'Submission Date': '',
  })

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  const colCount1 = 14
  for (let c = 0; c < colCount1; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws1[addr]) ws1[addr].s = headerStyle
  }
  ws1['!cols'] = Array.from({ length: colCount1 }, () => ({ wch: 16 }))
  ws1['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length, c: colCount1 - 1 } }) }
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

  // Sheet 2: Employee Data
  const empRows = employees.map((e) => ({
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
    'Project': e.project_name || '',
    'AI Extracted': e.ai_extracted ? 'Yes' : 'No',
  }))

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
    'Project': s.project_name || '',
    'Amount': s.amount,
    'AI Extracted': s.ai_extracted ? 'Yes' : 'No',
  }))

  const ws3 = XLSX.utils.json_to_sheet(supRows.length > 0 ? supRows : [{}])
  const colCount3 = 7
  for (let c = 0; c < colCount3; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws3[addr]) ws3[addr].s = headerStyle
  }
  ws3['!cols'] = Array.from({ length: colCount3 }, () => ({ wch: 16 }))
  ws3['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(supRows.length, 1), c: colCount3 - 1 } }) }
  ws3['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws3, 'Supplies & Materials')

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
