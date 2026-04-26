// Round-trip tests: parse a QRE template file, run the result back through
// the export generator, re-parse, and assert the data survives 1:1.
//
// "1:1" means: sheet names, header text, and data values are identical.
// It does NOT include cell formatting / colors / formulas — those don't
// survive a parse-export round trip and the partner cares about the data.
//
// Run with: npm run test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'

import { parseQreSpreadsheet, QreParseError } from '@/lib/extractors/qre-spreadsheet'
import { generateExcel } from '@/lib/exports/generate-excel'

const FIXTURE_EMPTY = resolve(process.cwd(), 'tests/fixtures/qre-template-empty.xlsx')

test('parses empty template: 4 years, no rows, headers validate', () => {
  const buf = readFileSync(FIXTURE_EMPTY)
  const result = parseQreSpreadsheet(buf)
  assert.deepEqual(result.yearsSeen, [2022, 2023, 2024, 2025])
  assert.equal(result.employees.length, 0)
  assert.equal(result.supplies.length, 0)
})

test('rejects template with renamed employee header', () => {
  // Build a workbook that looks like the template but renames col A.
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    [2024],
    ['Name', 'Employee / Contractor', 'State Employee Located in', 'Total Wages (W2/1099)', 'Time Allocated to R&D', 'Project Time Allocated to'],
    ['Test Person', 'Employee', 'Georgia', 50000, 25, 'Project A'],
  ])
  XLSX.utils.book_append_sheet(wb, ws, '2024 Employee & Contractor Data')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  assert.throws(() => parseQreSpreadsheet(buf), QreParseError)
})

test('rejects workbook with no QRE sheets', () => {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['unrelated']]), 'Random')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  assert.throws(() => parseQreSpreadsheet(buf), QreParseError)
})

test('round-trip: filled workbook parses, exports, re-parses to same rows', () => {
  // Build a synthetic workbook in the template shape with known data.
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Instructions placeholder']]), 'Instructions')

  const empSheet = XLSX.utils.aoa_to_sheet([
    [2024],
    ['Contractor / Employee Name', 'Employee / Contractor', 'State Employee Located in', 'Total Wages (W2/1099)', 'Time Allocated to R&D', 'Project Time Allocated to'],
    ['Alice Anders', 'Employee', 'Georgia', 80000, 25, 'Project Alpha'],
    ['Bob Brown', 'Contractor', 'Indiana', 45000, 100, 'Project Beta'],
  ])
  XLSX.utils.book_append_sheet(wb, empSheet, '2024 Employee & Contractor Data')

  const empSheet2 = XLSX.utils.aoa_to_sheet([
    [2025],
    ['Contractor / Employee Name', 'Employee / Contractor', 'State Employee Located in', 'Total Wages (W2/1099)', 'Time Allocated to R&D', 'Project Time Allocated to'],
    ['Alice Anders', 'Employee', 'Georgia', 90000, 30, 'Project Alpha'],
  ])
  XLSX.utils.book_append_sheet(wb, empSheet2, '2025 Employee & Contractor Data')

  const supSheet = XLSX.utils.aoa_to_sheet([
    [2024],
    ['2024 Expense', 'Project', '2024 Expense Amount'],
    ['Lab reagents', 'Project Alpha', 1200],
    ['Cloud compute', 'Project Beta', 800],
  ])
  XLSX.utils.book_append_sheet(wb, supSheet, 'R&D Supplies Expenses - 2024')

  const supSheet2 = XLSX.utils.aoa_to_sheet([
    [2025],
    ['2025 Expense', 'Project', '2025 Expense Amount'],
  ])
  XLSX.utils.book_append_sheet(wb, supSheet2, 'R&D Supplies Expenses - 2025')

  const filledBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  // Pass 1: parse
  const parsed1 = parseQreSpreadsheet(filledBuf)
  assert.deepEqual(parsed1.yearsSeen, [2024, 2025])
  assert.equal(parsed1.employees.length, 3)
  assert.equal(parsed1.supplies.length, 2)

  // Run through export
  const exported = generateExcel({
    submission: { tax_years: [2024, 2025] },
    employees: parsed1.employees,
    supplies: parsed1.supplies,
  })

  // Pass 2: re-parse the export
  const parsed2 = parseQreSpreadsheet(exported)
  assert.deepEqual(parsed2.yearsSeen, parsed1.yearsSeen)
  assert.equal(parsed2.employees.length, parsed1.employees.length)
  assert.equal(parsed2.supplies.length, parsed1.supplies.length)

  // Compare row data — sort by name within year for stable comparison.
  const sortEmps = (rows: typeof parsed1.employees) =>
    [...rows].sort((a, b) => a.tax_year - b.tax_year || a.full_name.localeCompare(b.full_name))
  const sortSups = (rows: typeof parsed1.supplies) =>
    [...rows].sort((a, b) => a.tax_year - b.tax_year || a.description.localeCompare(b.description))

  assert.deepEqual(sortEmps(parsed2.employees), sortEmps(parsed1.employees))
  assert.deepEqual(sortSups(parsed2.supplies), sortSups(parsed1.supplies))
})

test('exported workbook has expected sheet names and structure', () => {
  const buf = generateExcel({
    submission: { tax_years: [2023, 2024] },
    employees: [
      { tax_year: 2024, full_name: 'Carla Cole', employee_type: 'Employee', state: 'Georgia', total_wages: 60000, rd_percentage: 50, project_name: 'Project A' },
    ],
    supplies: [
      { tax_year: 2024, description: 'Test reagent', project_name: 'Project A', amount: 500 },
    ],
  })

  const wb = XLSX.read(buf, { type: 'buffer' })
  const expectedSheets = [
    'Instructions',
    '2024 Employee & Contractor Data',
    'R&D Supplies Expenses - 2024',
    '2023 Employee & Contractor Data',
    'R&D Supplies Expenses - 2023',
  ]
  assert.deepEqual(wb.SheetNames, expectedSheets)

  // Spot-check headers on the year sheets
  const empWs = wb.Sheets['2024 Employee & Contractor Data']
  const empRows = XLSX.utils.sheet_to_json(empWs, { header: 1, defval: null }) as unknown[][]
  assert.equal(empRows[0][0], 2024) // year banner
  assert.equal(empRows[1][0], 'Contractor / Employee Name')
  assert.equal(empRows[1][3], 'Total Wages (W2/1099)')
  assert.equal(empRows[2][0], 'Carla Cole')

  const supWs = wb.Sheets['R&D Supplies Expenses - 2024']
  const supRows = XLSX.utils.sheet_to_json(supWs, { header: 1, defval: null }) as unknown[][]
  assert.equal(supRows[0][0], 2024)
  assert.equal(supRows[1][0], '2024 Expense')
  assert.equal(supRows[1][2], '2024 Expense Amount')
})
