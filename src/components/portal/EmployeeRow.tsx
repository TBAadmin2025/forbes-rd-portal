'use client'

import { useState, useEffect, useRef } from 'react'
import { calcRDHours, calcQualifiedAmount } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Employee } from '@/lib/types/database.types'

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

type RowMode = 'draft' | 'viewing' | 'editing'

interface EmployeeRowProps {
  employee: Partial<Employee> & { _localId: string }
  submissionId: string
  taxYear: number
  onSaved: (localId: string, saved: Employee) => void
  onUpdated: (id: string, data: Partial<Employee>) => void
  onDelete: (id: string | undefined, localId: string) => void
}

export default function EmployeeRow({
  employee,
  submissionId,
  taxYear,
  onSaved,
  onUpdated,
  onDelete,
}: EmployeeRowProps) {
  const isSaved = !!employee.id
  const [mode, setMode] = useState<RowMode>(isSaved ? 'viewing' : 'draft')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [flash, setFlash] = useState(false)

  // Draft / editing fields
  const [fullName, setFullName] = useState(employee.full_name || '')
  const [employeeType, setEmployeeType] = useState<'Employee' | 'Contractor'>(
    employee.employee_type || 'Employee'
  )
  const [state, setState] = useState(employee.state || 'Georgia')
  const [totalWages, setTotalWages] = useState(employee.total_wages ?? 0)
  const [totalHours, setTotalHours] = useState(employee.total_hours_worked ?? 0)
  const [rdPercent, setRdPercent] = useState(employee.rd_percentage ?? 0)
  const [projectName, setProjectName] = useState(employee.project_name || '')

  // Snapshot for cancel in editing mode
  const [snapshot, setSnapshot] = useState({
    fullName: employee.full_name || '',
    employeeType: (employee.employee_type || 'Employee') as 'Employee' | 'Contractor',
    state: employee.state || 'Georgia',
    totalWages: employee.total_wages ?? 0,
    totalHours: employee.total_hours_worked ?? 0,
    rdPercent: employee.rd_percentage ?? 0,
    projectName: employee.project_name || '',
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const rdHours = calcRDHours(totalHours, rdPercent)
  const qualifiedAmount = calcQualifiedAmount(totalWages, rdPercent)

  const canSave = fullName.trim() !== '' && totalWages > 0 && rdPercent > 0

  // Draft auto-save: debounce 1500ms, only when all required fields filled
  useEffect(() => {
    if (mode !== 'draft') return
    if (!canSave) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: submissionId,
            tax_year: taxYear,
            full_name: fullName,
            employee_type: employeeType,
            state,
            total_wages: totalWages,
            total_hours_worked: totalHours,
            rd_percentage: rdPercent,
            project_name: projectName || null,
          }),
        })
        const created = await res.json()
        if (created.id) {
          onSaved(employee._localId, created)
          setSnapshot({
            fullName, employeeType, state, totalWages, totalHours, rdPercent, projectName,
          })
          setMode('viewing')
          setFlash(true)
          setTimeout(() => setFlash(false), 600)
        }
      } catch { /* silent */ }
    }, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fullName, employeeType, state, totalWages, totalHours, rdPercent, projectName])

  const handleSaveEdit = async () => {
    if (!employee.id || !canSave) return
    try {
      const data: Partial<Employee> = {
        full_name: fullName,
        employee_type: employeeType,
        state,
        total_wages: totalWages,
        total_hours_worked: totalHours,
        rd_percentage: rdPercent,
        project_name: projectName || null,
      }
      await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      onUpdated(employee.id, data)
      setSnapshot({
        fullName, employeeType, state, totalWages, totalHours, rdPercent, projectName,
      })
      setMode('viewing')
    } catch { /* silent */ }
  }

  const handleCancelEdit = () => {
    setFullName(snapshot.fullName)
    setEmployeeType(snapshot.employeeType)
    setState(snapshot.state)
    setTotalWages(snapshot.totalWages)
    setTotalHours(snapshot.totalHours)
    setRdPercent(snapshot.rdPercent)
    setProjectName(snapshot.projectName)
    setMode('viewing')
  }

  const handleStartEdit = () => {
    setSnapshot({
      fullName, employeeType, state, totalWages, totalHours, rdPercent, projectName,
    })
    setMode('editing')
  }

  const handleConfirmDelete = async () => {
    if (employee.id) {
      try { await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' }) } catch { /* silent */ }
    }
    onDelete(employee.id, employee._localId)
    setShowDeleteModal(false)
  }

  // Styles
  const cellPad: React.CSSProperties = { padding: '6px 4px' }
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
    fontSize: 11, color: 'var(--charcoal)', padding: '6px 4px', whiteSpace: 'nowrap',
  }
  const viewNum: React.CSSProperties = { ...viewText, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, lineHeight: 1, padding: '2px 4px',
  }

  const rowBg = flash
    ? 'rgba(0,79,53,0.06)'
    : mode === 'editing'
      ? 'rgba(108,22,28,0.02)'
      : undefined

  // --- VIEWING STATE ---
  if (mode === 'viewing') {
    return (
      <>
        <tr style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.4s' }}>
          <td style={viewText}>{fullName}</td>
          <td style={viewText}>{employeeType}</td>
          <td style={viewText}>{state}</td>
          <td style={viewNum}>{formatCurrency(totalWages)}</td>
          <td style={viewNum}>{totalHours.toLocaleString()}</td>
          <td style={viewNum}>{rdPercent}%</td>
          <td style={{ ...viewNum, color: 'var(--emerald)', fontWeight: 600 }}>{rdHours}</td>
          <td style={{ ...viewNum, color: 'var(--emerald)', fontWeight: 600 }}>
            {qualifiedAmount > 0 ? formatCurrency(qualifiedAmount) : '—'}
          </td>
          <td style={viewText}>{projectName || '—'}</td>
          <td style={{ ...cellPad, whiteSpace: 'nowrap', textAlign: 'right' }}>
            <button onClick={handleStartEdit} style={{ ...iconBtn, color: 'var(--muted)' }} title="Edit">
              &#9998;
            </button>
            <button onClick={() => setShowDeleteModal(true)} style={{ ...iconBtn, color: '#d0c8bc', fontSize: 18 }} title="Delete">
              &times;
            </button>
          </td>
        </tr>

        {/* Delete modal */}
        {showDeleteModal && (
          <tr>
            <td colSpan={10} style={{ padding: 0 }}>
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              }} onClick={() => setShowDeleteModal(false)}>
                <div onClick={(e) => e.stopPropagation()} style={{
                  background: 'white', borderRadius: 4, width: 380, overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}>
                  <div style={{
                    background: 'var(--cherry)', padding: '14px 20px',
                    fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '0.5px',
                  }}>
                    Remove Employee?
                  </div>
                  <div style={{ padding: '20px', fontSize: 12, color: 'var(--charcoal)', lineHeight: 1.6 }}>
                    This will permanently remove <strong>{fullName}</strong> from your {taxYear} R&D data.
                  </div>
                  <div style={{
                    padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10,
                    borderTop: '1px solid var(--border)',
                  }}>
                    <button onClick={() => setShowDeleteModal(false)} style={{
                      padding: '7px 16px', border: '1.5px solid var(--border)', background: 'transparent',
                      borderRadius: 3, fontSize: 11, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleConfirmDelete} style={{
                      padding: '7px 16px', border: 'none', background: 'var(--cherry)',
                      borderRadius: 3, fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer',
                    }}>Remove</button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    )
  }

  // --- DRAFT or EDITING STATE ---
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.4s' }}>
      <td style={cellPad}>
        <input style={inputStyle} placeholder="Full name" value={fullName}
          onChange={(e) => setFullName(e.target.value)} />
      </td>
      <td style={cellPad}>
        <select style={inputStyle} value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value as 'Employee' | 'Contractor')}>
          <option value="Employee">Employee</option>
          <option value="Contractor">Contractor</option>
        </select>
      </td>
      <td style={cellPad}>
        <select style={inputStyle} value={state} onChange={(e) => setState(e.target.value)}>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td style={cellPad}>
        <input style={numberStyle} type="number" min={0} value={totalWages || ''}
          onChange={(e) => setTotalWages(Number(e.target.value) || 0)} />
      </td>
      <td style={cellPad}>
        <input style={numberStyle} type="number" min={0} value={totalHours || ''}
          onChange={(e) => setTotalHours(Number(e.target.value) || 0)} />
      </td>
      <td style={{ ...cellPad, position: 'relative' }}>
        <input style={{ ...numberStyle, paddingRight: 18 }} type="number" min={0} max={100}
          value={rdPercent || ''} onChange={(e) => setRdPercent(Number(e.target.value) || 0)} />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--muted)', pointerEvents: 'none',
        }}>%</span>
      </td>
      <td style={cellPad}>
        <input style={autoStyle} readOnly value={rdHours || ''} tabIndex={-1} />
      </td>
      <td style={cellPad}>
        <input style={autoStyle} readOnly
          value={qualifiedAmount > 0 ? formatCurrency(qualifiedAmount) : '—'} tabIndex={-1} />
      </td>
      <td style={cellPad}>
        <input style={inputStyle} placeholder="R&D activity name" value={projectName}
          onChange={(e) => setProjectName(e.target.value)} />
      </td>
      <td style={{ ...cellPad, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {mode === 'draft' ? (
          <button onClick={() => onDelete(undefined, employee._localId)}
            style={{ ...iconBtn, color: '#d0c8bc', fontSize: 18 }} title="Remove draft">&times;</button>
        ) : (
          <>
            <button onClick={handleSaveEdit} disabled={!canSave}
              style={{
                padding: '5px 10px', border: 'none', background: canSave ? 'var(--cherry)' : '#ccc',
                borderRadius: 3, fontSize: 10, fontWeight: 600, color: 'white', cursor: canSave ? 'pointer' : 'default',
                marginRight: 4,
              }}>Save</button>
            <button onClick={handleCancelEdit}
              style={{
                padding: '5px 10px', border: '1.5px solid var(--border)', background: 'transparent',
                borderRadius: 3, fontSize: 10, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              }}>Cancel</button>
          </>
        )}
      </td>
    </tr>
  )
}
