'use client'

import { useState, useEffect, useCallback } from 'react'
import EmployeeRow from './EmployeeRow'
import SupplyRow from './SupplyRow'
import { calcQualifiedAmount } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Employee, Supply, QRAActivity } from '@/lib/types/database.types'

interface YearBlockProps {
  year: number
  submissionId: string
  initialEmployees?: Employee[]
  initialSupplies?: Supply[]
  qraActivities?: QRAActivity[]
  defaultExpanded?: boolean
}

type LocalSupply = Partial<Supply> & { _localId: string }

let nextId = 0
function localId() {
  return `local_${++nextId}_${Date.now()}`
}

export default function YearBlock({
  year,
  submissionId,
  initialEmployees = [],
  initialSupplies = [],
  qraActivities = [],
  defaultExpanded = false,
}: YearBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [supplies, setSupplies] = useState<LocalSupply[]>(
    initialSupplies.map((s) => ({ ...s, _localId: s.id || localId() }))
  )

  // Update local state when parent props change (e.g., after add/remove employees)
  useEffect(() => {
    setEmployees(initialEmployees)
  }, [initialEmployees])

  // Employee callback
  const handleEmployeeUpdated = useCallback(
    (id: string, data: Partial<Employee>) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      )
    },
    []
  )

  // Supply callbacks
  const addSupply = () => {
    setSupplies((prev) => [
      ...prev,
      {
        _localId: localId(),
        tax_year: year,
        submission_id: submissionId,
        description: '',
        vendor: null,
        project_name: null,
        amount: 0,
      },
    ])
  }

  const handleSupplySaved = useCallback(
    (lid: string, saved: Supply) => {
      setSupplies((prev) =>
        prev.map((s) => (s._localId === lid ? { ...saved, _localId: lid } : s))
      )
    },
    []
  )

  const handleSupplyUpdated = useCallback(
    (id: string, data: Partial<Supply>) => {
      setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
    },
    []
  )

  const handleSupplyDelete = useCallback(
    (_id: string | undefined, lid: string) => {
      setSupplies((prev) => prev.filter((s) => s._localId !== lid))
    },
    []
  )

  // Year total
  const empTotal = employees.reduce((sum, e) => {
    const wages = e.total_wages ?? 0
    const pct = e.rd_percentage ?? 0
    return sum + calcQualifiedAmount(wages, pct)
  }, 0)
  const supTotal = supplies.filter((s) => !!s.id).reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const yearTotal = empTotal + supTotal

  const thStyle: React.CSSProperties = {
    padding: '8px 4px',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    textAlign: 'left',
    borderBottom: '2px solid var(--border)',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'var(--charcoal)',
          padding: '13px 18px',
          borderRadius: expanded ? '3px 3px 0 0' : 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'border-radius 0.2s',
        }}
      >
        <span className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ivory)' }}>
          {year}
        </span>
        <div className="flex items-center" style={{ gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px',
              color: 'rgba(240,231,215,0.55)',
            }}>
              Year Total
            </div>
            <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--champagne)' }}>
              {yearTotal > 0 ? formatCurrency(yearTotal) : '$0'}
            </div>
          </div>
          <span style={{
            fontSize: 12, color: 'rgba(240,231,215,0.5)',
            transition: 'transform 0.2s', display: 'inline-block',
            transform: expanded ? 'rotate(0)' : 'rotate(180deg)',
          }}>
            ▲
          </span>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 3px 3px',
          }}
        >
          {/* Employee table — horizontal scroll container */}
          <div
            style={{
              overflowX: 'auto',
              position: 'relative',
              maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
            }}
          >
            <table style={{ width: '100%', minWidth: 1450, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, minWidth: 200 }}>Name</th>
                  <th style={{ ...thStyle, minWidth: 130 }}>Type</th>
                  <th style={{ ...thStyle, minWidth: 130 }}>State</th>
                  <th style={{ ...thStyle, textAlign: 'right', minWidth: 150 }}>Total Wages</th>
                  <th style={{ ...thStyle, textAlign: 'right', minWidth: 130 }}>Total Hrs</th>
                  <th style={{ ...thStyle, textAlign: 'right', minWidth: 110 }}>% R&D</th>
                  <th style={{ ...thStyle, textAlign: 'right', minWidth: 130 }}>
                    R&D Hrs
                    <div style={{ fontSize: 9, fontWeight: 400, letterSpacing: '1px', color: 'var(--muted)', marginTop: 2 }}>AUTO</div>
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right', minWidth: 150 }}>
                    Qualified Amt
                    <div style={{ fontSize: 9, fontWeight: 400, letterSpacing: '1px', color: 'var(--muted)', marginTop: 2 }}>AUTO</div>
                  </th>
                  <th style={{ ...thStyle, minWidth: 240 }}>R&D Projects</th>
                  <th style={{ ...thStyle, minWidth: 30, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}>
                      No employees worked in {year}. Add employees on the Employees tab and select this year.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <EmployeeRow
                      key={emp.id}
                      employee={emp}
                      qraActivities={qraActivities}
                      onUpdated={handleEmployeeUpdated}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Supplies divider */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: 'var(--muted)',
              padding: '12px 12px 8px',
              background: '#faf7f1',
              borderTop: '1px solid var(--border)',
            }}
          >
            Supplies, Materials & R&D Expenses
          </div>

          {/* Supplies table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Vendor</th>
                  <th style={thStyle}>R&D Project</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...thStyle, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((sup) => (
                  <SupplyRow
                    key={sup._localId}
                    supply={sup}
                    submissionId={submissionId}
                    taxYear={year}
                    qraActivities={qraActivities}
                    onSaved={handleSupplySaved}
                    onUpdated={handleSupplyUpdated}
                    onDelete={handleSupplyDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Supply button */}
          <div style={{ padding: '10px 12px' }}>
            <button
              onClick={addSupply}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                border: '1.5px dashed rgba(108,22,28,0.2)',
                background: 'transparent',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              + Add Expense
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
