'use client'

import { useState, useEffect, useCallback } from 'react'
import EmployeeSummaryRow from './EmployeeSummaryRow'
import EmployeeDetailDrawer from './EmployeeDetailDrawer'
import BulkAssignProjectsModal from './BulkAssignProjectsModal'
import SupplySummaryRow from './SupplySummaryRow'
import SupplyDetailDrawer from './SupplyDetailDrawer'
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
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [supplyDrawer, setSupplyDrawer] = useState<{ mode: 'edit' | 'new'; supply: Supply | null } | null>(null)

  // Update local state when parent props change
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

  // Bulk assign saved → reload employees from API
  const handleBulkSaved = useCallback(async () => {
    const res = await fetch(`/api/employees?submission_id=${submissionId}&tax_year=${year}`)
    if (res.ok) {
      const data = await res.json()
      setEmployees(data)
    }
  }, [submissionId, year])

  // Supply callbacks — drawer-based
  const handleSupplyCreated = useCallback((saved: Supply) => {
    setSupplies((prev) => [...prev, { ...saved, _localId: saved.id || localId() }])
  }, [])

  const handleSupplyUpdated = useCallback((id: string, data: Partial<Supply>) => {
    setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
  }, [])

  const handleSupplyDeleted = useCallback((id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // Year total
  const empTotal = employees.reduce((sum, e) => {
    const wages = e.total_wages ?? 0
    const pct = e.rd_percentage ?? 0
    return sum + calcQualifiedAmount(wages, pct)
  }, 0)
  const supTotal = supplies.filter((s) => !!s.id).reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const yearTotal = empTotal + supTotal

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
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
          {/* Toolbar — Quick Assign button */}
          {employees.length > 0 && qraActivities.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                background: '#faf7f1',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowBulkAssign(true)}
                style={{
                  background: 'var(--white)',
                  border: '1.5px solid var(--cherry)',
                  color: 'var(--cherry)',
                  padding: '6px 14px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ⚡ Quick Assign Projects
              </button>
            </div>
          )}

          {/* Employee table — simplified, click-to-edit */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Wages</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Hours</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>% R&D</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qualified</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Projects</th>
                  <th style={{ ...thStyle, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
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
                    <EmployeeSummaryRow
                      key={emp.id}
                      employee={emp}
                      qraActivities={qraActivities}
                      isSelected={drawerEmployeeId === emp.id}
                      onClick={() => setDrawerEmployeeId(emp.id)}
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
                  <th style={thStyle}>Expense</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Projects</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...thStyle, width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {supplies.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{
                      padding: '20px 12px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontWeight: 300,
                      fontStyle: 'italic',
                    }}>
                      No expenses yet. Click + Add Expense below.
                    </td>
                  </tr>
                ) : (
                  supplies.filter((s) => !!s.id).map((sup) => (
                    <SupplySummaryRow
                      key={sup._localId}
                      supply={sup}
                      qraActivities={qraActivities}
                      isSelected={supplyDrawer?.mode === 'edit' && supplyDrawer.supply?.id === sup.id}
                      onClick={() => setSupplyDrawer({ mode: 'edit', supply: sup as Supply })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Supply button */}
          <div style={{ padding: '10px 12px' }}>
            <button
              onClick={() => setSupplyDrawer({ mode: 'new', supply: null })}
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

      {/* Drawer (persistent across row clicks) */}
      <EmployeeDetailDrawer
        employees={employees}
        qraActivities={qraActivities}
        selectedId={drawerEmployeeId}
        year={year}
        onSelect={setDrawerEmployeeId}
        onUpdated={handleEmployeeUpdated}
      />

      {/* Supply detail drawer */}
      <SupplyDetailDrawer
        isOpen={supplyDrawer !== null}
        mode={supplyDrawer?.mode || null}
        supply={supplyDrawer?.supply || null}
        submissionId={submissionId}
        taxYear={year}
        qraActivities={qraActivities}
        onClose={() => setSupplyDrawer(null)}
        onSaved={handleSupplyCreated}
        onUpdated={handleSupplyUpdated}
        onDeleted={handleSupplyDeleted}
      />

      {/* Bulk assign modal */}
      <BulkAssignProjectsModal
        isOpen={showBulkAssign}
        year={year}
        employees={employees}
        qraActivities={qraActivities}
        onClose={() => setShowBulkAssign(false)}
        onSaved={handleBulkSaved}
      />
    </div>
  )
}
