'use client'

import { useState } from 'react'
import Button from '@/components/shared/Button'

interface ExportPanelProps {
  submissionId: string
  companyName?: string
  onExportGenerated: () => void
}

export default function ExportPanel({ submissionId, companyName, onExportGenerated }: ExportPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ pdf_url?: string; excel_url?: string } | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const res = await fetch('/api/exports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult({ pdf_url: data.pdf_url, excel_url: data.excel_url })
        onExportGenerated()
      }
    } catch {
      // silent
    }

    setGenerating(false)
  }

  const handleEmailPartner = () => {
    const subject = encodeURIComponent(`R&D Tax Credit Export — ${companyName || 'Client'}`)
    const body = encodeURIComponent(
      `Hi,\n\nPlease find the R&D Tax Credit export package for ${companyName || 'the client'}.\n\n` +
      (result?.pdf_url ? `PDF Summary: ${result.pdf_url}\n` : '') +
      (result?.excel_url ? `Excel Data: ${result.excel_url}\n` : '') +
      `\n—\nForbes Management`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
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
          Generate the PDF and Excel reports, then email them from your own account.
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

        {/* Download links after generation */}
        {result && (
          <div
            style={{
              background: 'rgba(240,231,215,0.1)',
              border: '1px solid rgba(240,231,215,0.15)',
              borderRadius: 3,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: 'var(--ivory)',
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              Export ready — download or email to your partner:
            </div>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {result.pdf_url && (
                <a
                  href={result.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(240,231,215,0.12)',
                    border: '1px solid rgba(240,231,215,0.2)',
                    borderRadius: 3,
                    padding: '7px 14px',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--champagne)',
                    textDecoration: 'none',
                  }}
                >
                  📄 Download PDF
                </a>
              )}
              {result.excel_url && (
                <a
                  href={result.excel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(240,231,215,0.12)',
                    border: '1px solid rgba(240,231,215,0.2)',
                    borderRadius: 3,
                    padding: '7px 14px',
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--champagne)',
                    textDecoration: 'none',
                  }}
                >
                  📊 Download Excel
                </a>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex" style={{ gap: 10 }}>
          {!result ? (
            <Button
              variant="champagne"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Export Package'}
            </Button>
          ) : (
            <>
              <Button
                variant="champagne"
                onClick={handleEmailPartner}
              >
                Email to Partner
              </Button>
              <Button
                variant="ghost-light"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
