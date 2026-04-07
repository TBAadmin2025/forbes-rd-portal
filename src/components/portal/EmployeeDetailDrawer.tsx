'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { calcRDHours, calcQualifiedAmount } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Employee, QRAActivity } from '@/lib/types/database.types'
import Button from '@/components/shared/Button'

interface EmployeeDetailDrawerProps {
  employees: Employee[]
  qraActivities: QRAActivity[]
  selectedId: string | null
  year: number
  onSelect: (id: string | null) => void
  onUpdated: (id: string, data: Partial<Employee>) => void
}

export default function EmployeeDetailDrawer({
  employees,
  qraActivities,
  selectedId,
  year,
  onSelect,
  onUpdated,
}: EmployeeDetailDrawerProps) {
  const employee = employees.find((e) => e.id === selectedId)

  const [totalWages, setTotalWages] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [rdPercent, setRdPercent] = useState(0)
  const [activityIds, setActivityIds] = useState<string[]>([])
  const [savedFlash, setSavedFlash] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const isFirstRender = useRef(true)
  const currentEmployeeId = useRef<string | null>(null)

  // When selected employee changes, hydrate state from that employee
  useEffect(() => {
    if (!employee) {
      currentEmployeeId.current = null
      return
    }
    // Only re-hydrate if switching to a different employee
    if (currentEmployeeId.current !== employee.id) {
      currentEmployeeId.current = employee.id
      isFirstRender.current = true
      setTotalWages(employee.total_wages ?? 0)
      setTotalHours(employee.total_hours_worked ?? 0)
      setRdPercent(employee.rd_percentage ?? 0)
      setActivityIds(employee.activity_ids || [])
    }
  }, [employee])

  // Persist current edits to API (used by save button + auto-save)
  const persist = useCallback(
    async (data: Partial<Employee>) => {
      if (!employee?.id) return
      setSaving(true)
      try {
        await fetch(`/api/employees/${employee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        onUpdated(employee.id, data)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 800)
      } catch { /* silent */ }
      setSaving(false)
    },
    [employee?.id, onUpdated]
  )

  // Auto-save on field change with 1500ms debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!employee?.id) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persist({
        total_wages: totalWages,
        total_hours_worked: totalHours,
        rd_percentage: rdPercent,
        activity_ids: activityIds,
      })
    }, 1500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWages, totalHours, rdPercent, activityIds])

  // ESC to close
  useEffect(() => {
    if (!selectedId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelect(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, onSelect])

  if (!selectedId || !employee) return null

  const rdHours = calcRDHours(totalHours, rdPercent)
  const qualifiedAmount = calcQualifiedAmount(totalWages, rdPercent)

  // Find next employee in the array for "Save & Next"
  const currentIdx = employees.findIndex((e) => e.id === selectedId)
  const nextEmployee = currentIdx >= 0 && currentIdx < employees.length - 1
    ? employees[currentIdx + 1]
    : null

  function toggleActivity(id: string) {
    setActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  async function handleSaveAndNext() {
    // Force save current edits immediately (no debounce wait)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    await persist({
      total_wages: totalWages,
      total_hours_worked: totalHours,
      rd_percentage: rdPercent,
      activity_ids: activityIds,
    })
    if (nextEmployee) {
      onSelect(nextEmployee.id)
    } else {
      onSelect(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => onSelect(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,17,17,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '92vw',
          background: 'var(--ivory)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--cherry)',
            padding: '20px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }} />
          <button
            onClick={() => onSelect(null)}
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
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'var(--champagne)',
                marginBottom: 6,
              }}
            >
              {year} · Employee {currentIdx + 1} of {employees.length}
            </div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ivory)', lineHeight: 1.2 }}>
              {employee.full_name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(240,231,215,0.6)', marginTop: 4 }}>
              {employee.employee_type} · {employee.state}
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Wage / Hours / % grid */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Total Wages">
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={totalWages || ''}
                  onChange={(e) => setTotalWages(Number(e.target.value) || 0)}
                  className="finput"
                  style={{ paddingLeft: 24, fontSize: 14 }}
                  placeholder="0"
                />
              </div>
            </Field>
            <Field label="Total Hours">
              <input
                type="number"
                min={0}
                value={totalHours || ''}
                onChange={(e) => setTotalHours(Number(e.target.value) || 0)}
                className="finput"
                style={{ fontSize: 14 }}
                placeholder="0"
              />
            </Field>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Field label="% Time on R&D">
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rdPercent || ''}
                  onChange={(e) => setRdPercent(Number(e.target.value) || 0)}
                  className="finput"
                  style={{ paddingRight: 28, fontSize: 14 }}
                  placeholder="0"
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                >
                  %
                </span>
              </div>
            </Field>
          </div>

          {/* Calculated values */}
          <div
            style={{
              background: 'rgba(0,79,53,0.06)',
              border: '1px solid rgba(0,79,53,0.15)',
              borderRadius: 4,
              padding: 16,
              marginBottom: 24,
              display: 'flex',
              gap: 24,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  marginBottom: 4,
                }}
              >
                R&D Hours
              </div>
              <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)' }}>
                {rdHours || 0}
              </div>
            </div>
            <div style={{ width: 1, background: 'rgba(0,79,53,0.15)' }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  marginBottom: 4,
                }}
              >
                Qualified Amount
              </div>
              <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)' }}>
                {qualifiedAmount > 0 ? formatCurrency(qualifiedAmount) : '—'}
              </div>
            </div>
          </div>

          {/* QRA Projects */}
          <div>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 12 }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                R&D Projects
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--cherry)',
                  fontWeight: 600,
                }}
              >
                {activityIds.length} of {qraActivities.length} selected
              </span>
            </div>
            {qraActivities.length === 0 ? (
              <div
                style={{
                  background: 'var(--warm)',
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                No activities yet. Upload the QRA PDF on the QRA Activities tab.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qraActivities.map((a) => {
                  const checked = activityIds.includes(a.id)
                  return (
                    <label
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        background: checked ? 'rgba(108,22,28,0.06)' : 'var(--white)',
                        border: checked ? '1.5px solid var(--cherry)' : '1px solid var(--border)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleActivity(a.id)}
                        style={{
                          marginTop: 2,
                          accentColor: 'var(--cherry)',
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--charcoal)',
                            marginBottom: a.description ? 3 : 0,
                          }}
                        >
                          {a.project_number ? `${a.project_number}. ` : ''}{a.name}
                        </div>
                        {a.description && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              fontWeight: 300,
                              lineHeight: 1.5,
                            }}
                          >
                            {a.description.length > 120
                              ? a.description.slice(0, 120) + '...'
                              : a.description}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
            {saving ? 'Saving...' : savedFlash ? '✓ Saved' : 'Auto-saves as you type'}
          </div>
          {nextEmployee ? (
            <Button variant="cherry" size="sm" onClick={handleSaveAndNext}>
              Save & Next →
            </Button>
          ) : (
            <Button variant="cherry" size="sm" onClick={() => onSelect(null)}>
              Done ✓
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
