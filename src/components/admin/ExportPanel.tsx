'use client'

import { useState } from 'react'
import Button from '@/components/shared/Button'
import type { SubmissionCompleteness } from '@/lib/inventory/completeness'

interface ExportPanelProps {
  submissionId: string
  companyName?: string
  documentCount?: number
  projectCount?: number
  hasCompanyInfo?: boolean
  hasDiscovery?: boolean
  completeness: SubmissionCompleteness
  exportSentAt?: string | null
  onExportGenerated: () => void
}

interface ExportResult {
  pdf_url?: string
  excel_url?: string
  discovery_pdf_url?: string
  qra_pdf_url?: string
  document_zip_url?: string
  full_package_url?: string
}

const ITEMS = [
  { key: 'discovery_pdf', icon: '📋', label: 'Discovery Questionnaire', desc: 'Filled questionnaire PDF' },
  { key: 'qra_pdf', icon: '🔬', label: 'QRA Project Report', desc: 'R&D project narratives for IRS' },
  { key: 'summary_pdf', icon: '📄', label: 'Summary PDF Report', desc: 'Credit calculations & QRE data' },
  { key: 'excel', icon: '📊', label: 'Excel Flat File', desc: 'Raw data + payroll key + discovery' },
  { key: 'document_zip', icon: '📁', label: 'Supporting Documents', desc: 'ZIP of all uploaded files' },
] as const

type ItemKey = typeof ITEMS[number]['key']

export default function ExportPanel({
  submissionId,
  companyName,
  documentCount = 0,
  projectCount = 0,
  hasCompanyInfo = false,
  hasDiscovery = false,
  completeness,
  exportSentAt,
  onExportGenerated,
}: ExportPanelProps) {
  const [selected, setSelected] = useState<Record<ItemKey, boolean>>({
    discovery_pdf: true,
    qra_pdf: true,
    summary_pdf: true,
    excel: true,
    document_zip: true,
  })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [showEmail, setShowEmail] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [markingSent, setMarkingSent] = useState(false)
  const [markedSent, setMarkedSent] = useState(!!exportSentAt)

  const toggle = (key: ItemKey) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  // Pre-flight checklist — same definition the Inventory page uses, so the two
  // views never disagree on what "complete" means.
  const yearsSet = completeness.totalYears > 0
  const yearsDetail = yearsSet
    ? completeness.taxYears.join(' · ')
    : 'No tax years selected — set them in Inventory'
  const inventoryDetail = !yearsSet
    ? 'Set tax years first'
    : completeness.complete
      ? `All ${completeness.totalYears} year${completeness.totalYears !== 1 ? 's' : ''} complete`
      : completeness.missing.length > 0
        ? `Missing: ${completeness.missing.slice(0, 3).join(', ')}${completeness.missing.length > 3 ? ` +${completeness.missing.length - 3} more` : ''}`
        : `${completeness.completeYears}/${completeness.totalYears} years complete`

  const requiredChecks = [
    { label: 'Business information', ready: hasCompanyInfo, detail: hasCompanyInfo ? 'Complete' : 'Missing — add company details first' },
    { label: 'Tax years selected', ready: yearsSet, detail: yearsDetail },
    { label: 'Per-year materials', ready: completeness.complete, detail: inventoryDetail },
    { label: 'R&D project narratives', ready: projectCount > 0, detail: projectCount > 0 ? `${projectCount} project${projectCount !== 1 ? 's' : ''} documented` : 'No projects documented' },
  ]

  const optionalChecks = [
    { label: 'Discovery questionnaire (optional)', ready: hasDiscovery, detail: hasDiscovery ? 'Complete' : 'Not started — fill out in Discovery tab' },
  ]

  const checks = [...requiredChecks, ...optionalChecks]
  const readyCount = requiredChecks.filter(c => c.ready).length
  const allReady = readyCount === requiredChecks.length

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/exports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          items: selected,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
        onExportGenerated()
      }
    } catch {
      // silent
    }

    setGenerating(false)
  }

  const handleMarkSent = async () => {
    setMarkingSent(true)
    await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ export_sent_at: new Date().toISOString() }),
    })
    setMarkingSent(false)
    setMarkedSent(true)
    onExportGenerated()
  }

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const emailSubject = `R&D Tax Credit Submission — ${companyName || 'Client'}`

  const includedItems: string[] = []
  if (selected.discovery_pdf) includedItems.push('Discovery Questionnaire (PDF)')
  if (selected.qra_pdf) includedItems.push('QRA Project Report — R&D Activity Narratives (PDF)')
  if (selected.summary_pdf) includedItems.push('R&D Tax Credit Summary Report (PDF)')
  if (selected.excel) includedItems.push('QRE Data Spreadsheet with Payroll Key (Excel)')
  if (selected.document_zip) includedItems.push('Supporting Documents (ZIP)')

  const emailBody = `Hi,

Please find attached the R&D tax credit submission package for ${companyName || 'the client'}.

Included in this package:
${includedItems.map(i => `• ${i}`).join('\n')}

Please let us know if you need anything else.

Best regards,
Forbes Management
admin@forbesmgt.com`

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
      <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ivory)', marginBottom: 4 }}>
          Export Package Builder
        </div>
        <div style={{ fontSize: 12, color: 'rgba(240,231,215,0.7)', fontWeight: 300, marginBottom: 20 }}>
          Review what&apos;s ready, generate the package, then download and email from your account.
        </div>

        {/* Pre-flight checklist */}
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 4,
            padding: '16px 18px',
            marginBottom: 20,
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(240,231,215,0.5)' }}>
              Pre-Flight Check
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 100,
              background: allReady ? 'var(--emerald)' : 'rgba(240,231,215,0.15)',
              color: allReady ? 'var(--white)' : 'var(--champagne)',
            }}>
              {readyCount}/{requiredChecks.length} required ready
            </span>
          </div>
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center"
              style={{ gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(240,231,215,0.06)' }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {check.ready ? '✅' : '⚠️'}
              </span>
              <span style={{ fontSize: 12, color: check.ready ? 'var(--ivory)' : 'var(--champagne)', fontWeight: check.ready ? 400 : 500, flex: 1 }}>
                {check.label}
              </span>
              <span style={{ fontSize: 11, color: check.ready ? 'rgba(240,231,215,0.4)' : 'var(--champagne)', fontWeight: 300 }}>
                {check.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Selection grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          {ITEMS.map((item) => {
            const isDisabled = item.key === 'document_zip' && documentCount === 0
            const isChecked = selected[item.key] && !isDisabled
            return (
              <button
                key={item.key}
                onClick={() => !isDisabled && toggle(item.key)}
                disabled={isDisabled}
                style={{
                  background: isChecked ? 'rgba(240,231,215,0.15)' : 'rgba(240,231,215,0.05)',
                  border: isChecked ? '2px solid rgba(240,231,215,0.4)' : '1px solid rgba(240,231,215,0.1)',
                  borderRadius: 4,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.35 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div className="flex items-center" style={{ gap: 10, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 18, height: 18, borderRadius: 3,
                      border: isChecked ? '2px solid var(--champagne)' : '2px solid rgba(240,231,215,0.3)',
                      background: isChecked ? 'var(--champagne)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'var(--cherry)', fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {isChecked ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ivory)', letterSpacing: '0.5px' }}>
                    {item.label}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(240,231,215,0.5)', fontWeight: 300, paddingLeft: 28 }}>
                  {isDisabled ? 'No documents uploaded' : item.desc}
                </div>
              </button>
            )
          })}
        </div>

        {/* Download zone */}
        {result && (
          <div
            style={{
              background: 'rgba(240,231,215,0.1)',
              border: '1px solid rgba(240,231,215,0.15)',
              borderRadius: 4,
              padding: '16px 18px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ivory)', fontWeight: 500, marginBottom: 12 }}>
              Export ready — download your files:
            </div>

            {result.full_package_url && (
              <a
                href={result.full_package_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--champagne)', color: 'var(--charcoal)', borderRadius: 3,
                  padding: '12px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px',
                  textTransform: 'uppercase', textDecoration: 'none', marginBottom: 12,
                }}
              >
                📦 Download Full Package (ZIP)
              </a>
            )}

            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {result.discovery_pdf_url && (
                <a href={result.discovery_pdf_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>📋 Discovery PDF</a>
              )}
              {result.qra_pdf_url && (
                <a href={result.qra_pdf_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>🔬 QRA Report</a>
              )}
              {result.pdf_url && (
                <a href={result.pdf_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>📄 Summary PDF</a>
              )}
              {result.excel_url && (
                <a href={result.excel_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>📊 Excel</a>
              )}
              {result.document_zip_url && (
                <a href={result.document_zip_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>📁 Documents ZIP</a>
              )}
            </div>
          </div>
        )}

        {/* Email helper */}
        {result && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowEmail(!showEmail)}
              style={{
                background: 'none', border: 'none', color: 'var(--champagne)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0,
                marginBottom: showEmail ? 12 : 0, textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {showEmail ? 'Hide email helper ▾' : 'Show email helper — copy & paste into Gmail ▸'}
            </button>

            {showEmail && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: 18 }}>
                <div style={{ marginBottom: 14 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(240,231,215,0.5)' }}>Subject</span>
                    <button onClick={() => handleCopy(emailSubject, 'subject')} style={copyBtnStyle}>
                      {copied === 'subject' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ background: 'rgba(240,231,215,0.08)', borderRadius: 3, padding: '10px 14px', fontSize: 13, color: 'var(--ivory)', fontWeight: 400 }}>
                    {emailSubject}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(240,231,215,0.5)' }}>Email Body</span>
                    <button onClick={() => handleCopy(emailBody, 'body')} style={copyBtnStyle}>
                      {copied === 'body' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ background: 'rgba(240,231,215,0.08)', borderRadius: 3, padding: '12px 14px', fontSize: 12, color: 'rgba(240,231,215,0.8)', fontWeight: 300, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {emailBody}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mark as Sent */}
        {result && !markedSent && (
          <div
            style={{
              background: 'rgba(0,79,53,0.15)',
              border: '1px solid rgba(0,79,53,0.3)',
              borderRadius: 4,
              padding: '16px 18px',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--ivory)', fontWeight: 500, marginBottom: 8 }}>
              Did you send the package to your partner?
            </div>
            <div style={{ fontSize: 11, color: 'rgba(240,231,215,0.5)', fontWeight: 300, marginBottom: 12, lineHeight: 1.6 }}>
              After you&apos;ve emailed the files, click below to mark this client as sent. This helps you track which packages have been delivered.
            </div>
            <Button
              variant="emerald"
              size="sm"
              onClick={handleMarkSent}
              disabled={markingSent}
            >
              {markingSent ? 'Saving...' : 'Yes, I\'ve Sent It ✓'}
            </Button>
          </div>
        )}

        {markedSent && (
          <div
            style={{
              background: 'rgba(0,79,53,0.15)',
              border: '1px solid rgba(0,79,53,0.3)',
              borderRadius: 4,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ivory)', fontWeight: 500 }}>
                Package sent to partner
              </div>
              <div style={{ fontSize: 11, color: 'rgba(240,231,215,0.5)', fontWeight: 300 }}>
                {exportSentAt
                  ? `Marked as sent ${new Date(exportSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'Just now'}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex" style={{ gap: 10 }}>
          {!result ? (
            <Button
              variant="champagne"
              onClick={handleGenerate}
              disabled={generating || selectedCount === 0}
            >
              {generating ? 'Generating...' : `Generate Package (${selectedCount} item${selectedCount !== 1 ? 's' : ''})`}
            </Button>
          ) : (
            <Button
              variant="ghost-light"
              size="sm"
              onClick={() => { setResult(null); setShowEmail(false) }}
            >
              Regenerate
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(240,231,215,0.08)', border: '1px solid rgba(240,231,215,0.15)',
  borderRadius: 3, padding: '7px 14px', fontSize: 11, fontWeight: 500,
  color: 'var(--champagne)', textDecoration: 'none',
}

const copyBtnStyle: React.CSSProperties = {
  background: 'rgba(240,231,215,0.1)', border: '1px solid rgba(240,231,215,0.2)',
  borderRadius: 3, padding: '3px 10px', fontSize: 9, fontWeight: 600,
  color: 'var(--champagne)', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase',
}
