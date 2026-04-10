'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'
import Tag from '@/components/shared/Tag'
import EmployeeImportModal from '@/components/portal/EmployeeImportModal'
import { useToast } from '@/components/shared/Toast'
import type { ClientEmployee } from '@/lib/types/database.types'

interface EmployeesTabProps {
  submissionId: string
  taxYears: number[]
}

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

interface DraftEmployee {
  full_name: string
  employee_type: 'Employee' | 'Contractor'
  state: string
  years_worked: number[]
}

function emptyDraft(taxYears: number[]): DraftEmployee {
  return { full_name: '', employee_type: 'Employee', state: 'Georgia', years_worked: [...taxYears] }
}

export default function EmployeesTab({ submissionId, taxYears }: EmployeesTabProps) {
  const { confirm: confirmAction } = useToast()
  const orderedYears = [...taxYears].sort((a, b) => b - a)
  const [employees, setEmployees] = useState<ClientEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<DraftEmployee | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftEmployee | null>(null)
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/client-employees?submission_id=${submissionId}`)
    if (res.ok) {
      const data = await res.json()
      setEmployees(data)
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!draft || !draft.full_name.trim()) return
    setSaving(true)
    const res = await fetch('/api/client-employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, ...draft }),
    })
    if (res.ok) {
      const newEmp = await res.json()
      setEmployees((prev) => [...prev, newEmp])
      setDraft(null)
    }
    setSaving(false)
  }

  async function handleEdit(id: string) {
    if (!editDraft) return
    setSaving(true)
    const res = await fetch(`/api/client-employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    if (res.ok) {
      const updated = await res.json()
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)))
      setEditingId(null)
      setEditDraft(null)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!(await confirmAction('Delete this employee? This will also remove their data from all years.'))) return
    const res = await fetch(`/api/client-employees/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
    }
  }

  function startEdit(emp: ClientEmployee) {
    setEditingId(emp.id)
    setEditDraft({
      full_name: emp.full_name,
      employee_type: emp.employee_type,
      state: emp.state || 'Georgia',
      years_worked: emp.years_worked || [],
    })
  }

  function toggleDraftYear(year: number) {
    setDraft((prev) => {
      if (!prev) return prev
      const has = prev.years_worked.includes(year)
      return {
        ...prev,
        years_worked: has ? prev.years_worked.filter((y) => y !== year) : [...prev.years_worked, year].sort(),
      }
    })
  }

  function toggleEditYear(year: number) {
    setEditDraft((prev) => {
      if (!prev) return prev
      const has = prev.years_worked.includes(year)
      return {
        ...prev,
        years_worked: has ? prev.years_worked.filter((y) => y !== year) : [...prev.years_worked, year].sort(),
      }
    })
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', marginBottom: 4 }}>
            Employees & Contractors
          </h2>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
            Add each person once and select which years they worked. Wages and hours go on the Data Entry tab.
          </div>
        </div>
        {!draft && (
          <div className="flex" style={{ gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowImport(true)}>
              ↑ Import CSV
            </Button>
            <Button variant="cherry" size="sm" onClick={() => setDraft(emptyDraft(taxYears))}>
              + Add Employee
            </Button>
          </div>
        )}
      </div>

      <EmployeeImportModal
        isOpen={showImport}
        submissionId={submissionId}
        taxYears={taxYears}
        existingNames={employees.map((e) => e.full_name)}
        onClose={() => setShowImport(false)}
        onImported={load}
      />

      {/* Empty state */}
      {employees.length === 0 && !draft && (
        <div
          style={{
            background: 'var(--warm)',
            borderRadius: 4,
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 14, color: 'var(--charcoal)', fontWeight: 500, marginBottom: 4 }}>
            No employees added yet
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.6 }}>
            Add each employee or contractor who worked on R&D activities.
          </div>
        </div>
      )}

      {/* Existing employees */}
      {employees.length > 0 && (
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 4,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)' }}>
                {['Name', 'Type', 'State', 'Years', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--champagne)', textAlign: 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isEditing = editingId === emp.id
                if (isEditing && editDraft) {
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--warm)' }}>
                      <td colSpan={5} style={{ padding: 16 }}>
                        <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 12 }}>
                          <FormField label="Full Name">
                            <input className="finput" value={editDraft.full_name} onChange={(e) => setEditDraft({ ...editDraft, full_name: e.target.value })} />
                          </FormField>
                          <FormField label="Type">
                            <select className="finput" value={editDraft.employee_type} onChange={(e) => setEditDraft({ ...editDraft, employee_type: e.target.value as 'Employee' | 'Contractor' })}>
                              <option value="Employee">Employee</option>
                              <option value="Contractor">Contractor</option>
                            </select>
                          </FormField>
                          <FormField label="State">
                            <select className="finput" value={editDraft.state} onChange={(e) => setEditDraft({ ...editDraft, state: e.target.value })}>
                              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </FormField>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                            Years Worked
                          </div>
                          <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                            {orderedYears.map((y) => {
                              const checked = editDraft.years_worked.includes(y)
                              return (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => toggleEditYear(y)}
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: 3,
                                    border: checked ? '2px solid var(--cherry)' : '1.5px solid var(--border)',
                                    background: checked ? 'rgba(108,22,28,0.05)' : 'var(--white)',
                                    color: checked ? 'var(--cherry)' : 'var(--muted)',
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                  }}
                                >
                                  {y}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex" style={{ gap: 10, marginTop: 16 }}>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditDraft(null) }}>
                            Cancel
                          </Button>
                          <Button variant="cherry" size="sm" onClick={() => handleEdit(emp.id)} disabled={saving || !editDraft.full_name.trim()}>
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                      {emp.full_name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Tag variant={emp.employee_type === 'Employee' ? 'progress' : 'invited'}>
                        {emp.employee_type}
                      </Tag>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                      {emp.state || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                      {emp.years_worked && emp.years_worked.length > 0 ? emp.years_worked.sort().join(', ') : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button onClick={() => startEdit(emp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cherry)', fontSize: 11, fontWeight: 600, marginRight: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new draft */}
      {draft && (
        <div
          style={{
            background: 'var(--white)',
            border: '2px dashed var(--cherry)',
            borderRadius: 4,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--cherry)', marginBottom: 16 }}>
            New Employee
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 12 }}>
            <FormField label="Full Name">
              <input
                className="finput"
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                placeholder="e.g., Sarah Johnson"
                autoFocus
              />
            </FormField>
            <FormField label="Type">
              <select className="finput" value={draft.employee_type} onChange={(e) => setDraft({ ...draft, employee_type: e.target.value as 'Employee' | 'Contractor' })}>
                <option value="Employee">Employee</option>
                <option value="Contractor">Contractor</option>
              </select>
            </FormField>
            <FormField label="State">
              <select className="finput" value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Years Worked
            </div>
            <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
              {orderedYears.map((y) => {
                const checked = draft.years_worked.includes(y)
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => toggleDraftYear(y)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 3,
                      border: checked ? '2px solid var(--cherry)' : '1.5px solid var(--border)',
                      background: checked ? 'rgba(108,22,28,0.05)' : 'var(--white)',
                      color: checked ? 'var(--cherry)' : 'var(--muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button variant="cherry" size="sm" onClick={handleAdd} disabled={saving || !draft.full_name.trim() || draft.years_worked.length === 0}>
              {saving ? 'Saving...' : 'Add Employee'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
