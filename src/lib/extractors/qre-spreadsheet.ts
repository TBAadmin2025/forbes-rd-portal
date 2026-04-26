import * as XLSX from 'xlsx'

// Shape of one parsed employee row from a QRE template's
// "{year} Employee & Contractor Data" sheet. Stays loose (numbers may be
// missing, names trimmed) — the caller decides how to map into the DB.
export interface QreEmployeeRow {
  tax_year: number
  full_name: string
  employee_type: 'Employee' | 'Contractor'
  state: string | null
  total_wages: number
  rd_percentage: number
  project_name: string | null
}

export interface QreSupplyRow {
  tax_year: number
  description: string
  project_name: string | null
  amount: number
}

export interface QreParseResult {
  employees: QreEmployeeRow[]
  supplies: QreSupplyRow[]
  yearsSeen: number[]
}

const EMPLOYEE_SHEET_RE = /^(\d{4}) Employee & Contractor Data$/
const SUPPLY_SHEET_RE = /^R&D Supplies Expenses - (\d{4})$/

const EMPLOYEE_HEADERS = [
  'Contractor / Employee Name',
  'Employee / Contractor',
  'State Employee Located in',
  'Total Wages (W2/1099)',
  'Time Allocated to R&D',
  'Project Time Allocated to',
] as const

const SUPPLY_HEADERS = ['Expense', 'Project', 'Expense Amount'] as const

export class QreParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QreParseError'
  }
}

function num(v: unknown): number {
  if (v == null || v === '') return 0
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function normalizeType(v: unknown): 'Employee' | 'Contractor' {
  const s = str(v).toLowerCase()
  return s.startsWith('c') || s.includes('1099') ? 'Contractor' : 'Employee'
}

// Year-tab layout: row 1 = year banner, row 2 = column headers, rows 3+ = data.
function parseEmployeeSheet(ws: XLSX.WorkSheet, year: number): QreEmployeeRow[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (rows.length < 3) return []

  const headers = (rows[1] || []).map((c) => str(c))
  // Loose header verification — first column must match exactly so we know
  // we're looking at the right shape. If the client renamed a column we'd
  // rather fail loud than silently misread.
  if (headers[0] !== EMPLOYEE_HEADERS[0]) {
    throw new QreParseError(
      `Sheet "${year} Employee & Contractor Data" has unexpected header in column A: got "${headers[0]}", expected "${EMPLOYEE_HEADERS[0]}"`,
    )
  }

  const out: QreEmployeeRow[] = []
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] || []
    const name = str(r[0])
    if (!name) continue // template often has trailing blank rows
    out.push({
      tax_year: year,
      full_name: name,
      employee_type: normalizeType(r[1]),
      state: str(r[2]) || null,
      total_wages: num(r[3]),
      rd_percentage: num(r[4]),
      project_name: str(r[5]) || null,
    })
  }
  return out
}

function parseSupplySheet(ws: XLSX.WorkSheet, year: number): QreSupplyRow[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  if (rows.length < 3) return []

  const headers = (rows[1] || []).map((c) => str(c))
  // The first header on the supplies tab is year-prefixed in the template
  // ("2025 Expense"), so check for the suffix.
  if (!headers[0] || !headers[0].toLowerCase().endsWith('expense')) {
    throw new QreParseError(
      `Sheet "R&D Supplies Expenses - ${year}" has unexpected header in column A: got "${headers[0]}", expected "<year> Expense"`,
    )
  }

  const out: QreSupplyRow[] = []
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] || []
    const desc = str(r[0])
    if (!desc) continue
    out.push({
      tax_year: year,
      description: desc,
      project_name: str(r[1]) || null,
      amount: num(r[2]),
    })
  }
  return out
}

/**
 * Parse a QRE template xlsx into structured rows.
 *
 * Rules:
 *   - Per-year sheets named exactly `"{year} Employee & Contractor Data"` and
 *     `"R&D Supplies Expenses - {year}"` are read; others are ignored.
 *   - If we find any expected sheet whose headers don't match the template,
 *     we throw `QreParseError` rather than partially importing garbage.
 *   - Empty rows are skipped silently.
 *   - Returns the union of years actually seen so the caller can scope the
 *     replacement to those years only.
 */
export function parseQreSpreadsheet(buffer: Buffer): QreParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const employees: QreEmployeeRow[] = []
  const supplies: QreSupplyRow[] = []
  const yearsSeen = new Set<number>()

  for (const name of wb.SheetNames) {
    const empMatch = name.match(EMPLOYEE_SHEET_RE)
    if (empMatch) {
      const year = Number(empMatch[1])
      employees.push(...parseEmployeeSheet(wb.Sheets[name], year))
      yearsSeen.add(year)
      continue
    }
    const supMatch = name.match(SUPPLY_SHEET_RE)
    if (supMatch) {
      const year = Number(supMatch[1])
      supplies.push(...parseSupplySheet(wb.Sheets[name], year))
      yearsSeen.add(year)
    }
  }

  if (yearsSeen.size === 0) {
    throw new QreParseError(
      'No QRE template sheets found. Expected sheets named "<year> Employee & Contractor Data" or "R&D Supplies Expenses - <year>".',
    )
  }

  return {
    employees,
    supplies,
    yearsSeen: [...yearsSeen].sort((a, b) => a - b),
  }
}
