'use client'

import Button from '@/components/shared/Button'
import type { Submission } from '@/lib/types/database.types'
import { formatDate } from '@/lib/utils/formatting'

interface ClientCardProps {
  submission: Submission
  onClick: () => void
}

function getActionButton(status: Submission['status']) {
  switch (status) {
    case 'invited':
      return { variant: 'ghost' as const, label: 'Resend Link' }
    case 'in_progress':
      return { variant: 'ghost' as const, label: 'View Progress' }
    case 'submitted':
      return { variant: 'cherry' as const, label: 'Review Now' }
    case 'in_review':
      return { variant: 'cherry' as const, label: 'Continue Review' }
    case 'complete':
      return { variant: 'dark' as const, label: 'View Export' }
  }
}

function getMetaText(submission: Submission) {
  if (submission.submitted_at) {
    return `Submitted ${formatDate(submission.submitted_at)}`
  }
  if (submission.started_at) {
    return `Last active ${formatDate(submission.last_active_at)}`
  }
  return `Invited ${formatDate(submission.invited_at)}`
}

export default function ClientCard({ submission, onClick }: ClientCardProps) {
  const action = getActionButton(submission.status)

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: 13,
        marginBottom: 9,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--charcoal)',
          marginBottom: 2,
        }}
      >
        {submission.contact_name || 'Unknown'}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 300,
          marginBottom: 8,
        }}
      >
        {submission.company_name || 'No company'}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          marginBottom: 9,
        }}
      >
        {getMetaText(submission)}
      </div>
      <Button
        variant={action.variant}
        size="sm"
        style={{ width: '100%' }}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        {action.label}
      </Button>

      <style>{`
        div[role="button"]:hover {
          border-color: var(--cherry) !important;
          box-shadow: 0 4px 16px rgba(108,22,28,0.08);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}
