'use client'

import { formatCurrency } from '@/lib/utils/formatting'
import type { Supply, QRAActivity } from '@/lib/types/database.types'

interface SupplySummaryRowProps {
  supply: Partial<Supply> & { _localId?: string }
  qraActivities: QRAActivity[]
  isSelected: boolean
  onClick: () => void
}

export default function SupplySummaryRow({
  supply,
  qraActivities,
  isSelected,
  onClick,
}: SupplySummaryRowProps) {
  const description = supply.description || ''
  const vendor = supply.vendor || ''
  const amount = supply.amount ?? 0

  const selectedNames = (supply.project_name || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const activityCount = qraActivities.filter((a) => selectedNames.includes(a.name)).length
  const totalActivities = qraActivities.length

  const isComplete = description.trim() !== '' && amount > 0 && activityCount > 0
  const isPartial = description.trim() !== '' || amount > 0 || activityCount > 0

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
      <td style={{ ...cellStyle, fontWeight: 500, whiteSpace: 'normal' }}>
        {description || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Untitled expense</span>}
        {vendor && (
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
            {vendor}
          </div>
        )}
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
      <td style={{ ...cellRight, color: amount > 0 ? 'var(--emerald)' : 'var(--muted)', fontWeight: 600 }}>
        {amount > 0 ? formatCurrency(amount) : '—'}
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
