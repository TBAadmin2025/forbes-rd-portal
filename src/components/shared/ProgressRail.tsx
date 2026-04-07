'use client'

import { useRouter } from 'next/navigation'

const STEPS = ['Welcome', 'Business Info', 'Employees', 'Your Data', 'Documents', 'Review', 'Done']
const STEP_ROUTES = [
  '/portal/welcome',
  '/portal/company-info',
  '/portal/employees',
  '/portal/data-entry',
  '/portal/upload',
  '/portal/review',
  '/portal/confirmation',
]

interface ProgressRailProps {
  currentStep: number
  maxStepReached: number
}

export default function ProgressRail({ currentStep, maxStepReached }: ProgressRailProps) {
  const router = useRouter()

  return (
    <nav
      className="flex overflow-x-auto"
      style={{
        background: 'var(--charcoal2)',
        padding: '0 48px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {STEPS.map((label, i) => {
        const isDone = i <= maxStepReached && i < currentStep
        const isActive = i === currentStep
        const isReachable = i <= maxStepReached && !isActive
        const isClickable = isReachable && i !== currentStep

        return (
          <div
            key={label}
            className="flex items-center whitespace-nowrap"
            onClick={isClickable ? () => router.push(STEP_ROUTES[i]) : undefined}
            style={{
              padding: '14px 22px',
              fontSize: 10,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: isDone
                ? 'var(--emerald)'
                : isActive
                  ? 'var(--champagne)'
                  : 'rgba(255,255,255,0.22)',
              borderBottom: `2px solid ${
                isDone
                  ? 'var(--emerald)'
                  : isActive
                    ? 'var(--champagne)'
                    : 'transparent'
              }`,
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'all 0.2s',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (isClickable) e.currentTarget.style.color = 'var(--champagne)'
            }}
            onMouseLeave={(e) => {
              if (isClickable) {
                e.currentTarget.style.color = isDone ? 'var(--emerald)' : 'rgba(255,255,255,0.22)'
              }
            }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 18,
                height: 18,
                fontSize: 9,
                background: isDone
                  ? 'var(--emerald)'
                  : isActive
                    ? 'var(--champagne)'
                    : 'rgba(255,255,255,0.07)',
                color: isDone
                  ? 'var(--white)'
                  : isActive
                    ? 'var(--charcoal)'
                    : 'rgba(255,255,255,0.22)',
              }}
            >
              {isDone ? '✓' : i + 1}
            </span>
            {label}
          </div>
        )
      })}
    </nav>
  )
}
