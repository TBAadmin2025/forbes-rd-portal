'use client'

import ClientCard from './ClientCard'
import type { Submission } from '@/lib/types/database.types'

interface PipelineBoardProps {
  submissions: Submission[]
  onCardClick: (id: string) => void
}

const COLUMNS: {
  key: string
  label: string
  statuses: Submission['status'][]
  labelColor: string
  badgeBg: string
  badgeColor: string
}[] = [
  {
    key: 'invited',
    label: 'Invited',
    statuses: ['invited'],
    labelColor: 'var(--champ-dk)',
    badgeBg: 'rgba(226,196,155,0.2)',
    badgeColor: 'var(--champ-dk)',
  },
  {
    key: 'progress',
    label: 'In Progress',
    statuses: ['in_progress'],
    labelColor: 'var(--emerald)',
    badgeBg: 'rgba(0,79,53,0.12)',
    badgeColor: 'var(--emerald)',
  },
  {
    key: 'submitted',
    label: 'Submitted',
    statuses: ['submitted', 'in_review'],
    labelColor: 'var(--cherry)',
    badgeBg: 'rgba(108,22,28,0.1)',
    badgeColor: 'var(--cherry)',
  },
  {
    key: 'complete',
    label: 'Complete',
    statuses: ['complete'],
    labelColor: 'var(--charcoal)',
    badgeBg: 'var(--charcoal)',
    badgeColor: 'var(--champagne)',
  },
]

export default function PipelineBoard({ submissions, onCardClick }: PipelineBoardProps) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
    >
      {COLUMNS.map((col) => {
        const items = submissions.filter((s) => col.statuses.includes(s.status))
        return (
          <div
            key={col.key}
            style={{
              background: 'rgba(0,0,0,0.025)',
              borderRadius: 4,
              padding: 12,
            }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between"
              style={{
                marginBottom: 12,
                paddingBottom: 9,
                borderBottom: '2px solid rgba(0,0,0,0.06)',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: col.labelColor,
                }}
              >
                {col.label}
              </span>
              <span
                className="flex items-center justify-center"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: col.badgeBg,
                  color: col.badgeColor,
                }}
              >
                {items.length}
              </span>
            </div>

            {/* Cards */}
            {items.map((sub) => (
              <ClientCard
                key={sub.id}
                submission={sub}
                onClick={() => onCardClick(sub.id)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
