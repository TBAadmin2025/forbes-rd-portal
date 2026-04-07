'use client'

import { useState, useRef } from 'react'
import Button from '@/components/shared/Button'
import {
  parseEmployeeCsv,
  EMPLOYEE_CSV_TEMPLATE,
  type ParsedEmployeeRow,
} from '@/lib/utils/employee-csv'

interface EmployeeImportModalProps {
  isOpen: boolean
  submissionId: string
  taxYears: number[]
  existingNames: string[]
  onClose: () => void
  onImported: () => void
}

export default function EmployeeImportModal({
  isOpen,
  submissionId,
  taxYears,
  existingNames,
  onClose,
  onImported,
}: EmployeeImportModalProps) {
  const [rows, setRows] = useState<ParsedEmployeeRow[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const result = parseEmployeeCsv(text, taxYears, existingNames)
      setRows(result.rows)
      setHeaderError(result.headerError)
    }
    reader.readAsText(file)
  }

  function handleDownloadTemplate() {
    const blob = new Blob([EMPLOYEE_CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'forbes-employee-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.status === 'ready')
    if (validRows.length === 0) return
    setImporting(true)
    const res = await fetch('/api/client-employees/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        rows: validRows.map((r) => ({
          full_name: r.full_name,
          employee_type: r.employee_type,
          state: r.state,
          years_worked: r.years_worked,
        })),
      }),
    })
    setImporting(false)
    if (res.ok) {
      onImported()
      handleClose()
    } else {
      alert('Import failed. Please try again.')
    }
  }

  function handleClose() {
    setRows([])
    setHeaderError(null)
    setDragging(false)
    onClose()
  }

  const validCount = rows.filter((r) => r.status === 'ready').length
  const skippedCount = rows.filter((r) => r.status === 'duplicate').length
  const errorCount = rows.filter((r) => r.status === 'error').length

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,17,0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: 'var(--ivory)',
          borderRadius: 6,
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 40px 80px rgba(0,0,0,0.3)',
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--cherry)',
            padding: '20px 28px',
            borderRadius: '6px 6px 0 0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }} />
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(240,231,215,0.15)',
              border: 'none',
              color: 'var(--ivory)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            ×
          </button>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              className="font-serif"
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--ivory)' }}
            >
              Import Employees from CSV
            </div>
            <div style={{ fontSize: 12, color: 'rgba(240,231,215,0.7)', marginTop: 4, fontWeight: 300 }}>
              Upload a spreadsheet of employees and contractors. We&apos;ll figure out which years they worked from their hire and termination dates.
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {rows.length === 0 && !headerError && (
            <>
              {/* Instructions */}
              <div
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: 18,
                  marginBottom: 16,
                  fontSize: 12,
                  color: 'var(--charcoal)',
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--cherry)' }}>
                  Required CSV columns
                </div>
                <div style={{ fontWeight: 300, color: 'var(--muted)', marginBottom: 12 }}>
                  <strong>Full Name</strong>, <strong>Hire Date</strong>, <strong>Type</strong> (Employee or Contractor), <strong>State</strong>.{' '}
                  <strong>Termination Date</strong> is optional — leave blank if still employed.
                </div>
                <div>
                  <button
                    onClick={handleDownloadTemplate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--cherry)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ↓ Download CSV template
                  </button>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const f = e.dataTransfer.files[0]
                  if (f) handleFile(f)
                }}
                style={{
                  border: `2px dashed ${dragging ? 'var(--cherry)' : 'rgba(108,22,28,0.25)'}`,
                  borderRadius: 4,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragging ? 'rgba(108,22,28,0.04)' : 'var(--warm)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 4 }}>
                  Drop your CSV here, or click to browse
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
                  Accepts .csv files exported from Excel, Google Sheets, or any payroll system
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
            </>
          )}

          {headerError && (
            <div
              style={{
                background: 'rgba(108,22,28,0.05)',
                border: '1px solid rgba(108,22,28,0.2)',
                borderRadius: 4,
                padding: 16,
                color: 'var(--cherry)',
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
              }}
            >
              {headerError}
            </div>
          )}

          {rows.length > 0 && (
            <>
              {/* Summary */}
              <div
                className="flex"
                style={{
                  gap: 12,
                  marginBottom: 16,
                  padding: 14,
                  background: 'var(--white)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}
              >
                <SummaryStat label="Ready to import" value={validCount} color="var(--emerald)" />
                <SummaryStat label="Duplicates skipped" value={skippedCount} color="var(--champ-dk)" />
                <SummaryStat label="Errors" value={errorCount} color="var(--cherry)" />
              </div>

              {/* Preview table */}
              <div
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  maxHeight: 360,
                  overflowY: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--charcoal)', position: 'sticky', top: 0 }}>
                      {['#', 'Name', 'Type', 'State', 'Years', 'Status'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '9px 12px',
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            color: 'var(--champagne)',
                            textAlign: 'left',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const statusColor =
                        r.status === 'ready'
                          ? 'var(--emerald)'
                          : r.status === 'duplicate'
                            ? 'var(--champ-dk)'
                            : 'var(--cherry)'
                      const statusIcon = r.status === 'ready' ? '✓' : r.status === 'duplicate' ? '⚠' : '✗'
                      return (
                        <tr key={r.rowNum} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{r.rowNum}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--charcoal)' }}>
                            {r.full_name || <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{r.employee_type}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{r.state || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>
                            {r.years_worked.length > 0 ? r.years_worked.join(', ') : '—'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ color: statusColor, fontWeight: 600 }}>
                              {statusIcon} {r.error || 'Ready'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button
                  onClick={() => { setRows([]); setHeaderError(null) }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  ← Choose a different file
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
            borderRadius: '0 0 6px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="cherry"
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? 'Importing...' : validCount > 0 ? `Import ${validCount} Employee${validCount === 1 ? '' : 's'}` : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginTop: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  )
}
