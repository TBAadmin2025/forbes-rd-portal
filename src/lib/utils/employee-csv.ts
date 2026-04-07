// CSV parser + validator for bulk employee imports.
// Required columns: Full Name, Hire Date, Type, State
// Optional column:  Termination Date

import { deriveYearsWorked } from './calculations'

const US_STATES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
  'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
])

export interface ParsedEmployeeRow {
  rowNum: number              // 1-based row index from the file (header = 0)
  full_name: string
  employee_type: 'Employee' | 'Contractor'
  state: string
  hire_date: string | null    // ISO YYYY-MM-DD
  term_date: string | null    // ISO YYYY-MM-DD or null
  years_worked: number[]
  status: 'ready' | 'duplicate' | 'error'
  error: string | null
}

// CSV template — also used for the download button
export const EMPLOYEE_CSV_TEMPLATE =
  'Full Name,Hire Date,Termination Date,Type,State\n' +
  'Jane Smith,2021-03-15,,Employee,Georgia\n' +
  'John Doe,2019-01-02,2024-08-30,Employee,Georgia\n' +
  'Maria Garcia,2022-06-01,,Contractor,Florida\n'

// Parse a CSV line accounting for quoted fields with commas inside
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

// Lenient date parser — accepts YYYY-MM-DD, MM/DD/YYYY, M/D/YY
function parseDate(raw: string): Date | null {
  const s = raw.trim()
  if (!s) return null

  // ISO YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return isNaN(d.getTime()) ? null : d
  }

  // MM/DD/YYYY or M/D/YYYY or M/D/YY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (m) {
    let year = Number(m[3])
    if (year < 100) year += year < 50 ? 2000 : 1900
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]))
    return isNaN(d.getTime()) ? null : d
  }

  // Fallback
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date | null): string | null {
  if (!d) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Find a header column index by trying multiple aliases (case-insensitive, trim)
function findColumn(headers: string[], aliases: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const a of aliases) {
    const idx = lower.indexOf(a.toLowerCase())
    if (idx >= 0) return idx
  }
  return -1
}

export interface ParseResult {
  rows: ParsedEmployeeRow[]
  headerError: string | null
}

export function parseEmployeeCsv(
  text: string,
  taxYears: number[],
  existingNames: string[],
): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    return { rows: [], headerError: 'CSV is empty' }
  }

  const headers = parseCsvLine(lines[0])
  const nameIdx = findColumn(headers, ['Full Name', 'Name', 'Employee Name'])
  const hireIdx = findColumn(headers, ['Hire Date', 'Start Date', 'Hired'])
  const termIdx = findColumn(headers, ['Termination Date', 'End Date', 'Terminated'])
  const typeIdx = findColumn(headers, ['Type', 'Employee Type'])
  const stateIdx = findColumn(headers, ['State'])

  if (nameIdx < 0 || hireIdx < 0 || typeIdx < 0 || stateIdx < 0) {
    return {
      rows: [],
      headerError:
        'Missing required columns. Expected: Full Name, Hire Date, Type, State (Termination Date optional).',
    }
  }

  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()))
  const seenInFile = new Set<string>()
  const rows: ParsedEmployeeRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const name = (cells[nameIdx] || '').trim()
    const hireRaw = (cells[hireIdx] || '').trim()
    const termRaw = termIdx >= 0 ? (cells[termIdx] || '').trim() : ''
    const typeRaw = (cells[typeIdx] || '').trim()
    const stateRaw = (cells[stateIdx] || '').trim()

    const row: ParsedEmployeeRow = {
      rowNum: i + 1,
      full_name: name,
      employee_type: 'Employee',
      state: stateRaw,
      hire_date: null,
      term_date: null,
      years_worked: [],
      status: 'ready',
      error: null,
    }

    if (!name) {
      row.status = 'error'
      row.error = 'Full Name is required'
      rows.push(row)
      continue
    }

    // Type: case-insensitive match, defaults to Employee
    const typeNorm = typeRaw.toLowerCase()
    if (typeNorm === 'contractor' || typeNorm === '1099') {
      row.employee_type = 'Contractor'
    } else if (typeNorm === 'employee' || typeNorm === 'w2' || typeNorm === '') {
      row.employee_type = 'Employee'
    } else {
      row.status = 'error'
      row.error = `Type must be Employee or Contractor (got "${typeRaw}")`
      rows.push(row)
      continue
    }

    if (!stateRaw || !US_STATES.has(stateRaw)) {
      row.status = 'error'
      row.error = stateRaw ? `Unknown state "${stateRaw}"` : 'State is required'
      rows.push(row)
      continue
    }

    const hireDate = parseDate(hireRaw)
    if (!hireDate) {
      row.status = 'error'
      row.error = hireRaw ? `Invalid hire date "${hireRaw}"` : 'Hire Date is required'
      rows.push(row)
      continue
    }
    row.hire_date = toIsoDate(hireDate)

    const termDate = termRaw ? parseDate(termRaw) : null
    if (termRaw && !termDate) {
      row.status = 'error'
      row.error = `Invalid termination date "${termRaw}"`
      rows.push(row)
      continue
    }
    if (termDate && termDate < hireDate) {
      row.status = 'error'
      row.error = 'Termination date is before hire date'
      rows.push(row)
      continue
    }
    row.term_date = toIsoDate(termDate)

    row.years_worked = deriveYearsWorked(hireDate, termDate, taxYears)
    if (row.years_worked.length === 0) {
      row.status = 'error'
      row.error = 'No tax years overlap with employment dates'
      rows.push(row)
      continue
    }

    // Duplicate detection: existing in DB, or earlier row in same file
    const key = name.toLowerCase().trim()
    if (existingSet.has(key)) {
      row.status = 'duplicate'
      row.error = 'Already exists in this submission — skipped'
    } else if (seenInFile.has(key)) {
      row.status = 'duplicate'
      row.error = 'Duplicate name in this file — skipped'
    } else {
      seenInFile.add(key)
    }

    rows.push(row)
  }

  return { rows, headerError: null }
}
