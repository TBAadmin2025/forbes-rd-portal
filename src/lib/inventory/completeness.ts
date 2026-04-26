// Per-year completeness rules for the Inventory feature.
//
// A submission is "complete" when every year listed in submissions.tax_years
// satisfies all required checks. Gross receipts are tracked but never block.
// QRE is satisfied by either in-portal employee data OR a legacy QRE
// spreadsheet upload for that year.
//
// This module is the single source of truth — both the Inventory page and
// ExportPanel call into it so the two views never disagree.

export interface YearAggregates {
  payrollDocs: number
  pandlDocs: number
  grossReceiptsDocs: number
  qreSpreadsheetDocs: number
  employeeRows: number
}

export interface YearStatus {
  year: number
  payroll: boolean
  pandl: boolean
  qre: boolean
  qreSource: 'employees' | 'spreadsheet' | 'none'
  grossReceipts: boolean
  complete: boolean
}

export interface SubmissionCompleteness {
  taxYears: number[]
  years: YearStatus[]
  totalYears: number
  completeYears: number
  complete: boolean
  missing: string[]
}

export type AggregateMap = Record<number, YearAggregates>

const REQUIRED_KEYS: Array<'payroll' | 'pandl' | 'qre'> = ['payroll', 'pandl', 'qre']

const LABEL: Record<'payroll' | 'pandl' | 'qre' | 'grossReceipts', string> = {
  payroll: 'Payroll',
  pandl: 'P&L',
  qre: 'QRE',
  grossReceipts: 'Gross receipts',
}

export function evaluateYear(year: number, agg: YearAggregates | undefined): YearStatus {
  const a = agg ?? {
    payrollDocs: 0,
    pandlDocs: 0,
    grossReceiptsDocs: 0,
    qreSpreadsheetDocs: 0,
    employeeRows: 0,
  }
  const payroll = a.payrollDocs > 0
  const pandl = a.pandlDocs > 0
  const grossReceipts = a.grossReceiptsDocs > 0
  const qreFromEmployees = a.employeeRows > 0
  const qreFromSpreadsheet = a.qreSpreadsheetDocs > 0
  const qre = qreFromEmployees || qreFromSpreadsheet
  const qreSource: YearStatus['qreSource'] = qreFromSpreadsheet
    ? 'spreadsheet'
    : qreFromEmployees
      ? 'employees'
      : 'none'

  return {
    year,
    payroll,
    pandl,
    qre,
    qreSource,
    grossReceipts,
    complete: payroll && pandl && qre,
  }
}

export function evaluateSubmission(
  taxYears: number[] | null | undefined,
  aggregates: AggregateMap,
): SubmissionCompleteness {
  const years = (taxYears ?? []).slice().sort((a, b) => a - b)
  const yearStatuses = years.map((y) => evaluateYear(y, aggregates[y]))
  const completeYears = yearStatuses.filter((y) => y.complete).length

  const missing: string[] = []
  for (const ys of yearStatuses) {
    for (const key of REQUIRED_KEYS) {
      if (!ys[key]) missing.push(`${ys.year} ${LABEL[key]}`)
    }
  }
  if (years.length === 0) missing.push('No tax years selected')

  return {
    taxYears: years,
    years: yearStatuses,
    totalYears: years.length,
    completeYears,
    complete: years.length > 0 && completeYears === years.length,
    missing,
  }
}
