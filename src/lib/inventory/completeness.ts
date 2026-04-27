// Per-year completeness rules for the Inventory feature.
//
// A submission is "complete" when every (year, requirement) pair is either
// 'uploaded' or 'n_a'. Gross receipts are tracked but never block.
// QRE is satisfied by either in-portal employee data OR a legacy QRE
// spreadsheet upload for that year.
//
// State model per requirement (n_a > uploaded > have > unknown):
//   'uploaded' — derived from real data (docs, employees, supplies)
//   'n_a'      — explicit override (does not apply to this client/year)
//   'have'     — explicit override (team confirmed the doc exists outside
//                the portal, but it isn't uploaded yet)
//   'unknown'  — default (no data, no override)
//
// This module is the single source of truth — Inventory, ExportPanel, and
// the Audit page all call into it so the views never disagree.

export type RequirementKey = 'payroll' | 'pandl' | 'qre'
export type RequirementState = 'unknown' | 'have' | 'uploaded' | 'n_a'

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
  // Resolved state per requirement, after applying manual overrides.
  states: Record<RequirementKey, RequirementState>
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

// Manual marks indexed by `${year}:${requirement_key}`.
export type MarkMap = Record<string, 'have' | 'n_a'>

const REQUIRED_KEYS: RequirementKey[] = ['payroll', 'pandl', 'qre']

const LABEL: Record<RequirementKey | 'grossReceipts', string> = {
  payroll: 'Payroll',
  pandl: 'P&L',
  qre: 'QRE',
  grossReceipts: 'Gross receipts',
}

export const REQUIREMENT_LABELS: Record<RequirementKey, string> = {
  payroll: LABEL.payroll,
  pandl: LABEL.pandl,
  qre: LABEL.qre,
}

function isUploaded(key: RequirementKey, agg: YearAggregates): boolean {
  if (key === 'payroll') return agg.payrollDocs > 0
  if (key === 'pandl') return agg.pandlDocs > 0
  // QRE: either in-portal employees OR uploaded QRE spreadsheet.
  return agg.employeeRows > 0 || agg.qreSpreadsheetDocs > 0
}

function resolveState(
  key: RequirementKey,
  agg: YearAggregates,
  manual: 'have' | 'n_a' | undefined,
): RequirementState {
  if (manual === 'n_a') return 'n_a'
  if (isUploaded(key, agg)) return 'uploaded'
  if (manual === 'have') return 'have'
  return 'unknown'
}

export function markKey(year: number, key: RequirementKey): string {
  return `${year}:${key}`
}

export function evaluateYear(
  year: number,
  agg: YearAggregates | undefined,
  marks: MarkMap = {},
): YearStatus {
  const a = agg ?? {
    payrollDocs: 0,
    pandlDocs: 0,
    grossReceiptsDocs: 0,
    qreSpreadsheetDocs: 0,
    employeeRows: 0,
  }

  const states: Record<RequirementKey, RequirementState> = {
    payroll: resolveState('payroll', a, marks[markKey(year, 'payroll')]),
    pandl: resolveState('pandl', a, marks[markKey(year, 'pandl')]),
    qre: resolveState('qre', a, marks[markKey(year, 'qre')]),
  }

  // The legacy boolean-per-requirement view still represents "is it
  // satisfied for export?" — that means uploaded OR n_a.
  const isSatisfied = (s: RequirementState) => s === 'uploaded' || s === 'n_a'
  const payroll = isSatisfied(states.payroll)
  const pandl = isSatisfied(states.pandl)
  const qre = isSatisfied(states.qre)
  const grossReceipts = a.grossReceiptsDocs > 0

  const qreFromEmployees = a.employeeRows > 0
  const qreFromSpreadsheet = a.qreSpreadsheetDocs > 0
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
    states,
  }
}

export function evaluateSubmission(
  taxYears: number[] | null | undefined,
  aggregates: AggregateMap,
  marks: MarkMap = {},
): SubmissionCompleteness {
  const years = (taxYears ?? []).slice().sort((a, b) => a - b)
  const yearStatuses = years.map((y) => evaluateYear(y, aggregates[y], marks))
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
