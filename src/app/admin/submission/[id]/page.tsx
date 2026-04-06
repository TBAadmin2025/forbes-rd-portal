'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import Tag from '@/components/shared/Tag'
import ExportPanel from '@/components/admin/ExportPanel'
import { formatCurrency, formatDate } from '@/lib/utils/formatting'
import type { Submission, Document as DocType } from '@/lib/types/database.types'

interface QRERow {
  tax_year: number
  employee_count: number
  total_rd_hours: number
  payroll_qre: number
  supplies_qre: number
  total_qre: number
}

interface CreditRow {
  label: string
  federal: number
  georgia: number
  total: number
}

const statusTagVariant = (status: Submission['status']) => {
  switch (status) {
    case 'invited': return 'invited' as const
    case 'in_progress': return 'progress' as const
    case 'submitted':
    case 'in_review': return 'submitted' as const
    case 'complete': return 'complete' as const
  }
}

export default function SubmissionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [documents, setDocuments] = useState<DocType[]>([])
  const [qreRows, setQreRows] = useState<QRERow[]>([])
  const [credits, setCredits] = useState<CreditRow[]>([])

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single()

      if (sub) setSubmission(sub as Submission)

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('submission_id', id)

      if (docs) setDocuments(docs as DocType[])

      const { data: summaries } = await supabase
        .from('qre_summary')
        .select('*')
        .eq('submission_id', id)
        .order('tax_year', { ascending: false })

      if (summaries) {
        setQreRows(
          summaries.map((s) => ({
            tax_year: s.tax_year ?? 0,
            employee_count: s.employee_count ?? 0,
            total_rd_hours: s.total_rd_hours ?? 0,
            payroll_qre: s.payroll_qre ?? 0,
            supplies_qre: s.supplies_qre ?? 0,
            total_qre: s.total_qre ?? 0,
          }))
        )
      }

      const { data: estimates } = await supabase
        .from('credit_estimates')
        .select('*')
        .eq('submission_id', id)

      if (estimates && estimates.length > 0) {
        const est = estimates[0]
        setCredits([
          {
            label: 'Conservative (6%)',
            federal: est.conservative_federal ?? 0,
            georgia: est.conservative_georgia ?? 0,
            total: est.conservative_total ?? 0,
          },
          {
            label: 'Full ASC (14%)',
            federal: est.asc_federal ?? 0,
            georgia: est.asc_georgia ?? 0,
            total: est.asc_total ?? 0,
          },
        ])
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!submission) return null

  const thStyle: React.CSSProperties = {
    background: '#f5f0e8',
    fontSize: 9,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: 'var(--muted)',
    padding: '8px 12px',
    textAlign: 'left',
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #f0ebe0',
    fontSize: 12,
  }

  const dsRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '7px 0',
    borderBottom: '1px solid #f5f0e8',
    fontSize: 12,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: 'var(--muted)',
    marginBottom: 12,
  }

  const handleFlag = async () => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: !submission.flagged }),
    })
    setSubmission((prev) => prev ? { ...prev, flagged: !prev.flagged } : prev)
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/pipeline')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: 'var(--muted)',
          cursor: 'pointer',
          marginBottom: 14,
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        ← Back to Pipeline
      </button>

      {/* Header */}
      <div
        className="flex items-start justify-between"
        style={{
          marginBottom: 24,
          paddingBottom: 18,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div
            className="font-serif"
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: 'var(--charcoal)',
              marginBottom: 5,
            }}
          >
            {submission.contact_name || 'Unknown Client'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontWeight: 300,
              marginBottom: 8,
            }}
          >
            {submission.company_name || 'No company'} ·{' '}
            {submission.submitted_at
              ? `Submitted ${formatDate(submission.submitted_at)}`
              : `Last active ${formatDate(submission.last_active_at)}`}
          </div>
          <Tag variant={statusTagVariant(submission.status)}>
            {submission.status.replace('_', ' ')}
          </Tag>
        </div>
        <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
          <Button
            variant="champagne"
            size="sm"
            onClick={() => router.push(`/portal/welcome?sid=${id}`)}
          >
            Work on Behalf
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFlag}>
            {submission.flagged ? '⚑ Flagged' : 'Flag for Review'}
          </Button>
          <Button
            variant="cherry"
            size="sm"
            onClick={() => {
              /* generate export */
            }}
          >
            Generate Export →
          </Button>
        </div>
      </div>

      {/* Detail grid: 2 columns */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}
      >
        {/* Business Info */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 20,
          }}
        >
          <div style={sectionTitleStyle}>Business Information</div>
          {[
            { label: 'Legal Name', value: submission.company_name },
            { label: 'DBA', value: submission.dba_name },
            { label: 'FEIN', value: submission.fein },
            { label: 'State Tax ID', value: submission.state_tax_id },
            { label: 'State', value: submission.business_state },
            { label: 'Contact', value: submission.contact_name },
            { label: 'Email', value: submission.contact_email },
            { label: 'Phone', value: submission.contact_phone },
          ].map((row) => (
            <div key={row.label} style={dsRowStyle}>
              <span style={{ color: 'var(--muted)', fontWeight: 300 }}>
                {row.label}
              </span>
              <span style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                {row.value || '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 20,
          }}
        >
          <div style={sectionTitleStyle}>Documents</div>
          {documents.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
              No documents uploaded yet.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '9px 12px',
                  background: 'var(--warm)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  marginBottom: 7,
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 14 }}>📄</span>
                <span
                  style={{ flex: 1, fontWeight: 500, color: 'var(--charcoal)' }}
                >
                  {doc.file_name}
                </span>
                {doc.tax_year && (
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: '1px',
                      background: 'var(--cherry)',
                      color: 'var(--ivory)',
                      padding: '2px 7px',
                      borderRadius: 100,
                      fontWeight: 600,
                    }}
                  >
                    {doc.tax_year}
                  </span>
                )}
                {doc.storage_url && (
                  <a
                    href={doc.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: 'var(--cherry)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* QRE Data */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={sectionTitleStyle}>QRE Data</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Year</th>
              <th style={thStyle}>People</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>R&D Hours</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Payroll QRE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Supplies QRE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total QRE</th>
            </tr>
          </thead>
          <tbody>
            {qreRows.map((row) => (
              <tr key={row.tax_year}>
                <td style={tdStyle}>
                  <strong>{row.tax_year}</strong>
                </td>
                <td style={tdStyle}>{row.employee_count}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                  {row.total_rd_hours.toLocaleString()}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                  {formatCurrency(row.payroll_qre)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                  {formatCurrency(row.supplies_qre)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                  {formatCurrency(row.total_qre)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit Estimates */}
      {credits.length > 0 && (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={sectionTitleStyle}>Credit Estimates</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Method</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Federal</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Georgia 10%</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((row) => (
                <tr key={row.label}>
                  <td style={tdStyle}>{row.label}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                    {formatCurrency(row.federal)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                    {formatCurrency(row.georgia)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--emerald)' }}>
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Export Panel */}
      <ExportPanel
        submissionId={id}
        companyName={submission?.company_name || undefined}
        onExportGenerated={() => {
          // Refresh submission data
          supabase
            .from('submissions')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }) => {
              if (data) setSubmission(data as Submission)
            })
        }}
      />
    </div>
  )
}
