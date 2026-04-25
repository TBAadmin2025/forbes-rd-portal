'use client'

import { useState, useEffect, useRef } from 'react'
import Card from '@/components/shared/Card'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import { useToast } from '@/components/shared/Toast'
import type { QRAActivity } from '@/lib/types/database.types'

interface QRAActivitiesTabProps {
  submissionId: string
}

type State = 'loading' | 'empty' | 'uploading' | 'extracting' | 'reviewing' | 'saved' | 'error'

interface ExtractedActivity {
  project_number: number | null
  name: string
  description: string | null
  technical_uncertainty: string | null
  experimentation: string | null
  outcomes: string | null
  raw_text: string | null
}

export default function QRAActivitiesTab({ submissionId }: QRAActivitiesTabProps) {
  const { confirm: confirmAction } = useToast()
  const [state, setState] = useState<State>('loading')
  const [savedActivities, setSavedActivities] = useState<QRAActivity[]>([])
  const [extracted, setExtracted] = useState<ExtractedActivity[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  async function loadActivities() {
    setState('loading')
    const res = await fetch(`/api/qra-activities?submission_id=${submissionId}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setSavedActivities(data)
        setState('saved')
      } else {
        setState('empty')
      }
    } else {
      setState('empty')
    }
  }

  async function handleFileSelect(file: File) {
    setError(null)
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const name = file.name.toLowerCase()
    const extOk = name.endsWith('.pdf') || name.endsWith('.docx')
    if (!allowed.includes(file.type) && !extOk) {
      setError('Please upload a PDF or .docx Word document. Legacy .doc is not supported — please save as .docx in Word.')
      return
    }
    setState('uploading')
    setTimeout(() => setState('extracting'), 500)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('submission_id', submissionId)

    try {
      const res = await fetch('/api/qra-extract', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Extraction failed')
        setState('error')
        return
      }
      const data = await res.json()
      if (!data.activities || data.activities.length === 0) {
        setError('No projects found in document.')
        setState('error')
        return
      }
      setExtracted(data.activities)
      setState('reviewing')
    } catch {
      setError('Something went wrong during extraction.')
      setState('error')
    }
  }

  function updateExtracted(idx: number, field: keyof ExtractedActivity, value: string) {
    setExtracted((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))
  }

  function removeExtracted(idx: number) {
    setExtracted((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSaveAll() {
    setSaving(true)
    const res = await fetch('/api/qra-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        activities: extracted.map((a) => ({ ...a, ai_extracted: true })),
        replace_existing: true,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setSavedActivities(data.activities || [])
      setExtracted([])
      setState('saved')
      // Notify the workspace to refresh its qraActivities state
      window.dispatchEvent(new CustomEvent('qra-activities-updated'))
    } else {
      setError('Failed to save activities')
    }
  }

  async function handleReupload() {
    if (!(await confirmAction('Re-extracting will replace all existing QRA activities. Continue?'))) return
    setExtracted([])
    setError(null)
    setState('empty')
  }

  async function handleDeleteActivity(id: string) {
    if (!(await confirmAction('Delete this activity? This cannot be undone.'))) return
    const res = await fetch(`/api/qra-activities/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSavedActivities((prev) => prev.filter((a) => a.id !== id))
      if (savedActivities.length === 1) setState('empty')
      window.dispatchEvent(new CustomEvent('qra-activities-updated'))
    }
  }

  // ── RENDER ──

  if (state === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Loading...</div>
  }

  if (state === 'uploading' || state === 'extracting') {
    return <ExtractionProgress state={state} />
  }

  if (state === 'reviewing') {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', marginBottom: 6 }}>
            Review Extracted Activities
          </h2>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
            We found <strong style={{ color: 'var(--charcoal)' }}>{extracted.length}</strong> project{extracted.length !== 1 ? 's' : ''} in your PDF.
            Review them below — edit names, descriptions, or remove any that don&apos;t apply. Click Save All when ready.
          </div>
        </div>

        {extracted.map((activity, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Project {activity.project_number || idx + 1}
                </div>
                <input
                  className="finput"
                  value={activity.name}
                  onChange={(e) => updateExtracted(idx, 'name', e.target.value)}
                  style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-playfair), serif' }}
                />
              </div>
              <button
                onClick={() => removeExtracted(idx)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--cherry)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}
              >
                Remove
              </button>
            </div>
            {activity.description && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Description
                </div>
                <div style={{ fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.7, fontWeight: 300 }}>
                  {activity.description}
                </div>
              </div>
            )}
            {activity.technical_uncertainty && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Technical Uncertainty
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
                  {activity.technical_uncertainty}
                </div>
              </div>
            )}
            {activity.experimentation && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Experimentation
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
                  {activity.experimentation}
                </div>
              </div>
            )}
            {activity.outcomes && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                  Outcomes
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
                  {activity.outcomes}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex" style={{ gap: 10, marginTop: 24 }}>
          <Button variant="ghost" size="sm" onClick={() => { setExtracted([]); setState('empty') }}>
            Cancel & Re-upload
          </Button>
          <Button variant="cherry" onClick={handleSaveAll} disabled={saving || extracted.length === 0}>
            {saving ? 'Saving...' : `Save All ${extracted.length} Activit${extracted.length === 1 ? 'y' : 'ies'}`}
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'saved') {
    return (
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div>
            <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', marginBottom: 4 }}>
              QRA Activities
            </h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
              {savedActivities.length} activit{savedActivities.length === 1 ? 'y' : 'ies'} saved from PDF
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReupload}>
            Re-upload PDF
          </Button>
        </div>

        {savedActivities.map((activity) => (
          <div
            key={activity.id}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--cherry)', marginBottom: 4 }}>
                  Project {activity.project_number || ''}
                </div>
                <div className="font-serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>
                  {activity.name}
                </div>
              </div>
              <button
                onClick={() => handleDeleteActivity(activity.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--cherry)', fontSize: 10, fontWeight: 600,
                  letterSpacing: '1px', textTransform: 'uppercase',
                }}
              >
                Delete
              </button>
            </div>
            {activity.description && (
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, fontWeight: 300 }}>
                {activity.description}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // empty or error
  return (
    <div>
      <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', marginBottom: 6 }}>
        QRA Activities
      </h2>
      <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, marginBottom: 20, lineHeight: 1.7 }}>
        Upload the client&apos;s QRA document. Our AI will read it and extract the numbered R&D projects automatically.
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <InfoBox>
            <strong style={{ color: 'var(--cherry)' }}>Error: </strong>{error}
          </InfoBox>
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFileSelect(f)
        }}
        style={{
          background: 'var(--white)',
          border: '2px dashed var(--border)',
          borderRadius: 6,
          padding: '60px 40px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--cherry)'
          e.currentTarget.style.background = 'var(--warm)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'var(--white)'
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
          Drag & drop your QRA document here
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
          PDF or Word (.docx) — click to browse
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelect(f)
          }}
        />
      </div>
    </div>
  )
}

// ── EXTRACTION PROGRESS ──
const STEPS = [
  { label: 'Uploading PDF to secure storage', icon: '📤' },
  { label: 'Reading the document', icon: '📄' },
  { label: 'Identifying R&D projects', icon: '🔍' },
  { label: 'Extracting project details', icon: '✨' },
  { label: 'Preparing your review', icon: '✅' },
]

function ExtractionProgress({ state }: { state: 'uploading' | 'extracting' }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(5)

  useEffect(() => {
    // Step animation: ~6s per step (5 steps total = 30s, matching typical extraction time)
    const stepTimer = setInterval(() => {
      setCurrentStep((s) => {
        if (s < STEPS.length - 1) return s + 1
        return s
      })
    }, 6000)

    // Progress bar animation: smoothly fill from 5% to 95% over 30s
    // Capped at 95% so it never looks "done" until the API actually responds
    const startTime = Date.now()
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime
      // Logarithmic curve: fast at start, slow near end
      const pct = Math.min(95, 5 + 90 * (1 - Math.exp(-elapsed / 12000)))
      setProgress(pct)
    }, 100)

    return () => {
      clearInterval(stepTimer)
      clearInterval(progressTimer)
    }
  }, [])

  return (
    <Card>
      <div style={{ padding: '32px 28px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
            {state === 'uploading' ? 'Uploading your PDF...' : 'Reading your QRA document...'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
            This usually takes 15-30 seconds. Please don&apos;t close this tab.
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              height: 8,
              background: 'var(--warm)',
              borderRadius: 100,
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--cherry), var(--champagne))',
                borderRadius: 100,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--muted)',
              marginTop: 6,
              textAlign: 'right',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            {Math.round(progress)}%
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((step, i) => {
            const isDone = i < currentStep
            const isActive = i === currentStep
            const isPending = i > currentStep
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: isPending ? 0.4 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isDone ? 'var(--emerald)' : isActive ? 'var(--cherry)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: 'var(--white)',
                    fontWeight: 700,
                    flexShrink: 0,
                    transition: 'background 0.3s',
                  }}
                >
                  {isDone ? '✓' : isActive ? <Spinner /> : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: isPending ? 'var(--muted)' : 'var(--charcoal)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
                <span style={{ fontSize: 16 }}>{step.icon}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function Spinner() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'var(--white)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )
}
