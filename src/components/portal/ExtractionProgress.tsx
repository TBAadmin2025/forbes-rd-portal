'use client'

import { useEffect, useState } from 'react'

interface ExtractionProgressProps {
  isVisible: boolean
  onComplete: () => void
}

const STEPS = [
  { label: 'Reading uploaded files', icon: '📄' },
  { label: 'Identifying employees & contractors', icon: '👥' },
  { label: 'Extracting wages and hours', icon: '💵' },
  { label: 'Calculating qualified amounts', icon: '🧮' },
  { label: 'Preparing your review form', icon: '✅' },
]

const STEP_DURATION = 1800

export default function ExtractionProgress({ isVisible, onComplete }: ExtractionProgressProps) {
  const [currentStep, setCurrentStep] = useState(-1)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(-1)
      setCompleted(false)
      return
    }

    // Start first step
    setCurrentStep(0)

    const timers: ReturnType<typeof setTimeout>[] = []

    STEPS.forEach((_, i) => {
      if (i > 0) {
        timers.push(
          setTimeout(() => setCurrentStep(i), STEP_DURATION * i)
        )
      }
    })

    // Complete after all steps
    timers.push(
      setTimeout(() => {
        setCurrentStep(STEPS.length)
        setCompleted(true)
      }, STEP_DURATION * STEPS.length)
    )

    // Call onComplete after a pause
    timers.push(
      setTimeout(() => {
        onComplete()
      }, STEP_DURATION * STEPS.length + 500)
    )

    return () => timers.forEach(clearTimeout)
  }, [isVisible, onComplete])

  if (!isVisible || completed) return null

  const progress = currentStep >= STEPS.length
    ? 100
    : Math.round(((currentStep + 1) / STEPS.length) * 100)

  return (
    <div
      style={{
        background: 'var(--charcoal)',
        borderRadius: 4,
        padding: 36,
        textAlign: 'center',
        marginBottom: 20,
        animation: 'fadeUp 0.3s ease',
      }}
    >
      <div
        className="font-serif"
        style={{
          fontSize: 22,
          color: 'var(--ivory)',
          marginBottom: 6,
        }}
      >
        Reading your documents…
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'rgba(240,231,215,0.45)',
          marginBottom: 28,
          fontWeight: 300,
        }}
      >
        Extracting your data automatically. About 20 seconds.
      </div>

      {/* Steps */}
      <div
        className="flex flex-col"
        style={{
          maxWidth: 380,
          margin: '0 auto 24px',
          gap: 8,
          textAlign: 'left',
        }}
      >
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isRunning = i === currentStep
          return (
            <div
              key={step.label}
              className="flex items-center"
              style={{
                gap: 12,
                padding: '10px 14px',
                borderRadius: 3,
                fontSize: 12,
                transition: 'all 0.3s',
                color: isDone
                  ? '#4caf7d'
                  : isRunning
                    ? 'var(--champagne)'
                    : 'rgba(240,231,215,0.4)',
                background: isDone
                  ? 'rgba(76,175,125,0.07)'
                  : isRunning
                    ? 'rgba(226,196,155,0.07)'
                    : 'rgba(255,255,255,0.03)',
              }}
            >
              {isDone ? (
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  ✓
                </span>
              ) : isRunning ? (
                <div
                  style={{
                    width: 15,
                    height: 15,
                    border: '2px solid rgba(226,196,155,0.2)',
                    borderTopColor: 'var(--champagne)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {step.icon}
                </span>
              )}
              {step.label} {step.icon !== '✅' || isDone ? '' : ''}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div
        style={{
          maxWidth: 380,
          margin: '0 auto',
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--cherry), var(--champagne))',
            borderRadius: 2,
            width: `${progress}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
