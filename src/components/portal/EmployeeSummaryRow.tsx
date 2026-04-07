'use client'

import { calcQualifiedAmount } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Employee, QRAActivity } from '@/lib/types/database.types'

interface EmployeeSummaryRowProps {
  employee: Employee
  qraActivities: QRAActivity[]
  isSelected: boolean
  onClick: () => void
}

export default function EmployeeSummaryRow({
  employee,
  qraActivities,
  isSelected,
  onClick,
}: EmployeeSummaryRowProps) {
  const wages = employee.total_wages ?? 0
  const hours = employee.total_hours_worked ?? 0
  const pct = employee.rd_percentage ?? 0
  const qualifiedAmount = calcQualifiedAmount(wages, pct)

  const activityIds = employee.activity_ids || []
  const activityCount = activityIds.length
  const totalActivities = qraActivities.length

  // Compute "complete" — has wages, hours, %, and at least one project
  const isComplete = wages > 0 && hours > 0 && pct > 0 && activityCount > 0
  const isPartial = wages > 0 || hours > 0 || pct > 0 || activityCount > 0

  const cellStyle: React.CSSProperties = {
    padding: '12px 12px',
    fontSize: 12,
    color: 'var(--charcoal)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  }
  const cellRight: React.CSSProperties = { ...cellStyle, textAlign: 'right' }

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: isSelected ? 'rgba(108,22,28,0.06)' : undefined,
        borderLeft: isSelected ? '3px solid var(--cherry)' : '3px solid transparent',
        transition: 'background 0.15s, border-left 0.15s',
      }}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'var(--warm)'
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = ''
      }}
    >
      <td style={{ ...cellStyle, fontWeight: 500 }}>
        {employee.full_name}
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
          {employee.employee_type} · {employee.state}
        </div>
      </td>
      <td style={cellRight}>{wages > 0 ? formatCurrency(wages) : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
      <td style={cellRight}>{hours > 0 ? hours.toLocaleString() : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
      <td style={cellRight}>{pct > 0 ? `${pct}%` : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
      <td style={{ ...cellRight, color: qualifiedAmount > 0 ? 'var(--emerald)' : 'var(--muted)', fontWeight: 600 }}>
        {qualifiedAmount > 0 ? formatCurrency(qualifiedAmount) : '—'}
      </td>
      <td style={{ ...cellStyle, textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 32,
            padding: '3px 10px',
            borderRadius: 100,
            fontSize: 10,
            fontWeight: 600,
            background: activityCount > 0 ? 'rgba(108,22,28,0.08)' : 'var(--warm)',
            color: activityCount > 0 ? 'var(--cherry)' : 'var(--muted)',
          }}
        >
          {activityCount} / {totalActivities}
        </span>
      </td>
      <td style={{ ...cellStyle, textAlign: 'center', width: 30 }}>
        {isComplete ? (
          <span style={{ color: 'var(--emerald)', fontSize: 14 }}>✓</span>
        ) : isPartial ? (
          <span style={{ color: 'var(--champagne)', fontSize: 14 }}>•</span>
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>○</span>
        )}
      </td>
    </tr>
  )
}
