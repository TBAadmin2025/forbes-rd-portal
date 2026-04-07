'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/shared/Button'
import type { Employee, QRAActivity } from '@/lib/types/database.types'

interface BulkAssignProjectsModalProps {
  isOpen: boolean
  year: number
  employees: Employee[]
  qraActivities: QRAActivity[]
  onClose: () => void
  onSaved: () => void
}

export default function BulkAssignProjectsModal({
  isOpen,
  year,
  employees,
  qraActivities,
  onClose,
  onSaved,
}: BulkAssignProjectsModalProps) {
  // Map: activityId → Set<employeeId>
  const [assignments, setAssignments] = useState<Map<string, Set<string>>>(new Map())
  const [saving, setSaving] = useState(false)

  // Hydrate assignments from current employee.activity_ids when opened
  useEffect(() => {
    if (!isOpen) return
    const m = new Map<string, Set<string>>()
    qraActivities.forEach((a) => {
      m.set(a.id, new Set())
    })
    employees.forEach((emp) => {
      const ids = emp.activity_ids || []
      ids.forEach((aid) => {
        if (!m.has(aid)) m.set(aid, new Set())
        m.get(aid)!.add(emp.id)
      })
    })
    setAssignments(m)
  }, [isOpen, employees, qraActivities])

  // Esc to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function toggleAssignment(activityId: string, employeeId: string) {
    setAssignments((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(activityId) || [])
      if (set.has(employeeId)) set.delete(employeeId)
      else set.add(employeeId)
      next.set(activityId, set)
      return next
    })
  }

  function selectAll(activityId: string) {
    setAssignments((prev) => {
      const next = new Map(prev)
      next.set(activityId, new Set(employees.map((e) => e.id)))
      return next
    })
  }

  function deselectAll(activityId: string) {
    setAssignments((prev) => {
      const next = new Map(prev)
      next.set(activityId, new Set())
      return next
    })
  }

  async function handleSave() {
    setSaving(true)

    // Compute the new activity_ids per employee from assignments
    const newAssignmentsByEmployee = new Map<string, string[]>()
    employees.forEach((emp) => newAssignmentsByEmployee.set(emp.id, []))

    assignments.forEach((empSet, activityId) => {
      empSet.forEach((empId) => {
        const arr = newAssignmentsByEmployee.get(empId) || []
        arr.push(activityId)
        newAssignmentsByEmployee.set(empId, arr)
      })
    })

    // Send PATCH for each employee whose assignments changed
    const updates: Promise<Response>[] = []
    for (const emp of employees) {
      const newIds = newAssignmentsByEmployee.get(emp.id) || []
      const oldIds = emp.activity_ids || []
      const oldSet = new Set(oldIds)
      const newSet = new Set(newIds)
      const isDifferent =
        oldIds.length !== newIds.length ||
        newIds.some((id) => !oldSet.has(id)) ||
        oldIds.some((id) => !newSet.has(id))
      if (isDifferent) {
        updates.push(
          fetch(`/api/employees/${emp.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_ids: newIds }),
          })
        )
      }
    }

    await Promise.all(updates)
    setSaving(false)
    onSaved()
    onClose()
  }

  const sortedActivities = [...qraActivities].sort(
    (a, b) => (a.project_number || 0) - (b.project_number || 0)
  )

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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
          maxWidth: 900,
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
            onClick={onClose}
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
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ivory)' }}>
              Quick Assign Projects
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(240,231,215,0.65)',
                marginTop: 4,
                fontWeight: 300,
              }}
            >
              {year} · Check off who worked on each project. Faster than going employee by employee.
            </div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {employees.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                fontSize: 13,
                color: 'var(--muted)',
                fontStyle: 'italic',
              }}
            >
              No employees worked in {year}. Add employees on the Employees tab first.
            </div>
          ) : sortedActivities.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                fontSize: 13,
                color: 'var(--muted)',
                fontStyle: 'italic',
              }}
            >
              No R&D projects available yet. Forbes Management adds these from your QRA documents.
            </div>
          ) : (
            sortedActivities.map((a) => {
              const assignedSet = assignments.get(a.id) || new Set<string>()
              const allChecked = employees.length > 0 && assignedSet.size === employees.length
              return (
                <div
                  key={a.id}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <div
                    className="flex items-start justify-between"
                    style={{ gap: 12, marginBottom: 14 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        className="font-serif"
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}
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
                          {a.description.length > 140
                            ? a.description.slice(0, 140) + '...'
                            : a.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => (allChecked ? deselectAll(a.id) : selectAll(a.id))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--cherry)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        padding: 0,
                      }}
                    >
                      {allChecked ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Employee checkboxes — grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {employees.map((emp) => {
                      const checked = assignedSet.has(emp.id)
                      return (
                        <label
                          key={emp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 3,
                            background: checked ? 'rgba(108,22,28,0.06)' : 'var(--warm)',
                            border: checked ? '1.5px solid var(--cherry)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignment(a.id, emp.id)}
                            style={{
                              accentColor: 'var(--cherry)',
                              width: 14,
                              height: 14,
                              flexShrink: 0,
                              cursor: 'pointer',
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--charcoal)',
                              fontWeight: checked ? 500 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {emp.full_name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
            borderRadius: '0 0 6px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="cherry"
            onClick={handleSave}
            disabled={saving || employees.length === 0 || sortedActivities.length === 0}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
