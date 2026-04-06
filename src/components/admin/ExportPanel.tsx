'use client'

import { useState } from 'react'
import Button from '@/components/shared/Button'

interface ExportPanelProps {
  submissionId: string
  onExportGenerated: () => void
}

export default function ExportPanel({ submissionId, onExportGenerated }: ExportPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const res = await fetch('/api/exports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })

      if (res.ok) {
        setSuccess(true)
        onExportGenerated()
      }
    } catch {
      // silent
    }

    setGenerating(false)
  }

  const items = [
    { icon: '📄', label: 'PDF Summary Report', desc: 'Complete study with credit calculations' },
    { icon: '📊', label: 'Excel Flat File', desc: 'Raw data for partner review' },
    { icon: '🔗', label: 'Document Links', desc: 'Links to all uploaded files' },
  ]

  return (
    <div
      style={{
        background: 'var(--cherry)',
        borderRadius: 4,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      {/* FM pattern */}
      <div
        className="fm-pattern absolute inset-0 pointer-events-none"
        style={{ opacity: 0.2 }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          className="font-serif"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ivory)',
            marginBottom: 4,
          }}
        >
          Generate Export Package
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(240,231,215,0.7)',
            fontWeight: 300,
            marginBottom: 20,
          }}
        >
          Everything Solutions Made Simple needs — built automatically from
          submitted data.
        </div>

        {/* Items grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(240,231,215,0.07)',
                border: '1px solid rgba(240,231,215,0.12)',
                borderRadius: 3,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--ivory)',
                  marginBottom: 3,
                  letterSpacing: '0.5px',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(240,231,215,0.6)',
                  fontWeight: 300,
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Success message */}
        {success && (
          <div
            style={{
              background: 'rgba(240,231,215,0.1)',
              border: '1px solid rgba(240,231,215,0.15)',
              borderRadius: 3,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--ivory)',
              fontWeight: 300,
            }}
          >
            ✓ Export package generated successfully.
          </div>
        )}

        {/* Actions */}
        <div className="flex" style={{ gap: 10 }}>
          <Button variant="ghost-light" size="sm">
            Preview Package
          </Button>
          <Button
            variant="champagne"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate & Send to Partner →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
