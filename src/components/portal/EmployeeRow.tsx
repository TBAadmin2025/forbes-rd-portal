'use client'

import { useState, useEffect, useRef } from 'react'
import { calcRDHours, calcQualifiedAmount } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Employee, QRAActivity } from '@/lib/types/database.types'

interface EmployeeRowProps {
  employee: Employee
  qraActivities: QRAActivity[]
  onUpdated: (id: string, data: Partial<Employee>) => void
}

export default function EmployeeRow({
  employee,
  qraActivities,
  onUpdated,
}: EmployeeRowProps) {
  const [totalWages, setTotalWages] = useState(employee.total_wages ?? 0)
  const [totalHours, setTotalHours] = useState(employee.total_hours_worked ?? 0)
  const [rdPercent, setRdPercent] = useState(employee.rd_percentage ?? 0)
  const [activityIds, setActivityIds] = useState<string[]>(employee.activity_ids || [])
  const [showActivityPicker, setShowActivityPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const isFirstRender = useRef(true)

  const rdHours = calcRDHours(totalHours, rdPercent)
  const qualifiedAmount = calcQualifiedAmount(totalWages, rdPercent)

  // Auto-save on field change with 1500ms debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!employee.id) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const data: Partial<Employee> = {
          total_wages: totalWages,
          total_hours_worked: totalHours,
          rd_percentage: rdPercent,
          activity_ids: activityIds,
        }
        await fetch(`/api/employees/${employee.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        onUpdated(employee.id, data)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 600)
      } catch { /* silent */ }
      setSaving(false)
    }, 1500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWages, totalHours, rdPercent, activityIds])

  function toggleActivity(id: string) {
    setActivityIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  // Styles
  const cellPad: React.CSSProperties = { padding: '6px 4px', verticalAlign: 'middle' }
  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--border)', background: 'var(--warm)', borderRadius: 2,
    padding: '6px 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--charcoal)',
    width: '100%', outline: 'none', boxSizing: 'border-box',
  }
  const numberStyle: React.CSSProperties = { ...inputStyle, textAlign: 'right' }
  const autoStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', textAlign: 'right', padding: '7px 10px',
    background: 'rgba(0,79,53,0.07)', color: 'var(--emerald)',
    border: '1.5px solid rgba(0,79,53,0.15)', borderRadius: 3,
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit', outline: 'none',
  }
  const viewText: React.CSSProperties = {
    fontSize: 11, color: 'var(--charcoal)', padding: '6px 4px', whiteSpace: 'nowrap', fontWeight: 500,
  }

  const selectedActivities = qraActivities.filter((a) => activityIds.includes(a.id))

  return (
    <tr
      style={{
        borderBottom: '1px solid var(--border)',
        background: savedFlash ? 'rgba(0,79,53,0.06)' : undefined,
        transition: 'background 0.4s',
      }}
    >
      {/* Name (read-only from master) */}
      <td style={viewText}>{employee.full_name}</td>

      {/* Type (read-only) */}
      <td style={{ ...viewText, color: 'var(--muted)' }}>{employee.employee_type}</td>

      {/* State (read-only) */}
      <td style={{ ...viewText, color: 'var(--muted)' }}>{employee.state}</td>

      {/* Wages */}
      <td style={cellPad}>
        <input
          style={numberStyle}
          type="number"
          min={0}
          value={totalWages || ''}
          onChange={(e) => setTotalWages(Number(e.target.value) || 0)}
          placeholder="0"
        />
      </td>

      {/* Hours */}
      <td style={cellPad}>
        <input
          style={numberStyle}
          type="number"
          min={0}
          value={totalHours || ''}
          onChange={(e) => setTotalHours(Number(e.target.value) || 0)}
          placeholder="0"
        />
      </td>

      {/* % R&D */}
      <td style={{ ...cellPad, position: 'relative' }}>
        <input
          style={{ ...numberStyle, paddingRight: 18 }}
          type="number"
          min={0}
          max={100}
          value={rdPercent || ''}
          onChange={(e) => setRdPercent(Number(e.target.value) || 0)}
          placeholder="0"
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--muted)', pointerEvents: 'none',
        }}>%</span>
      </td>

      {/* R&D Hours (auto) */}
      <td style={cellPad}>
        <input style={autoStyle} readOnly value={rdHours || ''} tabIndex={-1} />
      </td>

      {/* Qualified Amount (auto) */}
      <td style={cellPad}>
        <input
          style={autoStyle}
          readOnly
          value={qualifiedAmount > 0 ? formatCurrency(qualifiedAmount) : '—'}
          tabIndex={-1}
        />
      </td>

      {/* QRA Projects multi-select */}
      <td style={{ ...cellPad, position: 'relative' }}>
        <button
          onClick={() => setShowActivityPicker((s) => !s)}
          style={{
            width: '100%',
            border: '1.5px solid var(--border)',
            background: 'var(--warm)',
            borderRadius: 2,
            padding: '6px 8px',
            fontSize: 11,
            fontFamily: 'inherit',
            color: selectedActivities.length > 0 ? 'var(--charcoal)' : 'var(--muted)',
            textAlign: 'left',
            cursor: 'pointer',
            outline: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selectedActivities.length === 0
            ? 'Select projects...'
            : selectedActivities.length === 1
              ? selectedActivities[0].name
              : `${selectedActivities.length} projects`}
        </button>
        {showActivityPicker && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setShowActivityPicker(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 11,
                maxHeight: 280,
                overflowY: 'auto',
                minWidth: 260,
              }}
            >
              {qraActivities.length === 0 ? (
                <div style={{ padding: 16, fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                  No activities yet. Upload the QRA PDF on the QRA Activities tab.
                </div>
              ) : (
                qraActivities.map((a) => {
                  const checked = activityIds.includes(a.id)
                  return (
                    <label
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: checked ? 'rgba(108,22,28,0.04)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleActivity(a.id)}
                        style={{ marginTop: 2, accentColor: 'var(--cherry)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 2 }}>
                          {a.project_number ? `${a.project_number}. ` : ''}{a.name}
                        </div>
                        {a.description && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
                            {a.description.slice(0, 80)}{a.description.length > 80 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </>
        )}
      </td>

      {/* Status indicator */}
      <td style={{ ...cellPad, textAlign: 'center', width: 30 }}>
        {saving && <span style={{ fontSize: 9, color: 'var(--muted)' }}>...</span>}
      </td>
    </tr>
  )
}
