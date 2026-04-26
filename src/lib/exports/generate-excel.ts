import * as XLSX from 'xlsx'

// Generate the QRE spreadsheet in the exact shape of the partner-facing
// template. The portal is a typing UI for this spreadsheet — output must
// match what a client would have produced filling it out by hand.
//
// Layout per the template:
//   Instructions sheet — bullet text in col A
//   "{year} Employee & Contractor Data" — row 1 = year banner, row 2 = headers, rows 3+ = data
//   "R&D Supplies Expenses - {year}" — same shape, year-prefixed col headers
//
// Years exported = submission.tax_years if set, else default to 2022-2025.

interface Employee {
  tax_year: number
  full_name: string
  employee_type: string
  state: string | null
  total_wages: number | null
  rd_percentage: number | null
  project_name: string | null
}

interface Supply {
  tax_year: number
  description: string
  project_name: string | null
  amount: number | null
}

interface ExcelInput {
  submission: Record<string, unknown>
  employees: Employee[]
  supplies: Supply[]
}

const EMPLOYEE_HEADERS = [
  'Contractor / Employee Name',
  'Employee / Contractor',
  'State Employee Located in',
  'Total Wages (W2/1099)',
  'Time Allocated to R&D',
  'Project Time Allocated to',
] as const

const INSTRUCTIONS = [
  ['R&D Tax Credit QRE Spreadsheet'],
  [null],
  ['●      Enter the names of all R&D-related Employees / Contractors in the Employee & Contractor Data Tab'],
  ['●      Their total wages (W2) or contractor expense (often 1099) for the applicable tax year '],
  ['●      The state the employee/contractor was located in'],
  ['●      An estimate of the percent of overall time the person spent on R&D during the tax year. Please put these estimates in the “Development time” column (E).'],
  ['●      The project (Qualified Research Activity) the employee/contractor spent their applicable time working on'],
  ['●      All applicable supplies/materials/technology expenses that went into your R&D projects/activities can be entered in the R&D Supplies Expenses Tab for each applicable year'],
  [null],
  [null],
]

function buildEmployeeSheet(year: number, rows: Employee[]): XLSX.WorkSheet {
  const aoa: unknown[][] = [
    [year], // row 1: year banner
    [...EMPLOYEE_HEADERS], // row 2: headers
  ]
  for (const r of rows) {
    aoa.push([
      r.full_name,
      r.employee_type,
      r.state ?? '',
      r.total_wages ?? 0,
      r.rd_percentage ?? 0,
      r.project_name ?? '',
    ])
  }
  return XLSX.utils.aoa_to_sheet(aoa)
}

function buildSupplySheet(year: number, rows: Supply[]): XLSX.WorkSheet {
  const aoa: unknown[][] = [
    [year],
    [`${year} Expense`, 'Project', `${year} Expense Amount`],
  ]
  for (const r of rows) {
    aoa.push([r.description, r.project_name ?? '', r.amount ?? 0])
  }
  return XLSX.utils.aoa_to_sheet(aoa)
}

export function generateExcel({ submission, employees, supplies }: ExcelInput): Buffer {
  const wb = XLSX.utils.book_new()

  // Instructions
  const instructionsWs = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions')

  // Years to export — prefer the submission's configured tax_years; fall back
  // to the canonical 2022-2025 window if none set so the partner always gets
  // a workbook with the expected shape.
  const taxYears = ((submission.tax_years as number[]) ?? []).slice().sort((a, b) => a - b)
  const yearsToExport = taxYears.length > 0 ? taxYears : [2022, 2023, 2024, 2025]
  // Template ordering: most recent year first.
  const ordered = [...yearsToExport].sort((a, b) => b - a)

  for (const year of ordered) {
    const empRows = employees
      .filter((e) => e.tax_year === year)
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
    const supRows = supplies
      .filter((s) => s.tax_year === year)
      .sort((a, b) => a.description.localeCompare(b.description))

    XLSX.utils.book_append_sheet(wb, buildEmployeeSheet(year, empRows), `${year} Employee & Contractor Data`)
    XLSX.utils.book_append_sheet(wb, buildSupplySheet(year, supRows), `R&D Supplies Expenses - ${year}`)
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
