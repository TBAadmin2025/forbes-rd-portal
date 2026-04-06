'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/shared/Card'
import Button from '@/components/shared/Button'
import CreditSummary from '@/components/portal/CreditSummary'
import { formatCurrency, formatNumber } from '@/lib/utils/formatting'

interface YearRow {
  tax_year: number
  employee_count: number
  total_rd_hours: number
  payroll_qre: number
  supplies_qre: number
  total_qre: number
}

export default function ReviewPage() {
  const router = useRouter()
  const supabase = createClient()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [yearRows, setYearRows] = useState<YearRow[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: submission } = await supabase
        .from('submissions')
        .select('id')
        .eq('client_user_id', user.id)
        .single()

      if (!submission) return
      setSubmissionId(submission.id)

      const { data: summaries } = await supabase
        .from('qre_summary')
        .select('*')
        .eq('submission_id', submission.id)
        .order('tax_year', { ascending: false })

      if (summaries) {
        setYearRows(
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
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grandTotal = yearRows.reduce(
    (acc, r) => ({
      employee_count: acc.employee_count + r.employee_count,
      total_rd_hours: acc.total_rd_hours + r.total_rd_hours,
      payroll_qre: acc.payroll_qre + r.payroll_qre,
      supplies_qre: acc.supplies_qre + r.supplies_qre,
      total_qre: acc.total_qre + r.total_qre,
    }),
    { employee_count: 0, total_rd_hours: 0, payroll_qre: 0, supplies_qre: 0, total_qre: 0 }
  )

  const handleSubmit = async () => {
    if (!submissionId) return
    setSubmitting(true)

    await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        current_step: 4,
      }),
    })

    router.push('/portal/confirmation')
  }

  const thStyle: React.CSSProperties = {
    background: '#f0ebe0',
    fontSize: 9,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: 'var(--muted)',
    padding: '9px 14px',
    textAlign: 'left',
  }

  const tdStyle: React.CSSProperties = {
    padding: '11px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
  }

  const monoStyle: React.CSSProperties = {
    fontWeight: 600,
    color: 'var(--emerald)',
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Credit Summary */}
      {submissionId && <CreditSummary submissionId={submissionId} />}

      {/* QRE by Year Table */}
      <Card>
        <div
          className="font-serif"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 16,
          }}
        >
          QRE by Year
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Year</th>
              <th style={thStyle}>People</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total R&D Hours</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Payroll QRE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Supplies QRE</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Total QRE</th>
            </tr>
          </thead>
          <tbody>
            {yearRows.map((row) => (
              <tr key={row.tax_year}>
                <td style={tdStyle}>
                  <strong style={{ fontWeight: 600 }}>{row.tax_year}</strong>
                </td>
                <td style={tdStyle}>{row.employee_count}</td>
                <td style={{ ...tdStyle, textAlign: 'right', ...monoStyle }}>
                  {formatNumber(row.total_rd_hours)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', ...monoStyle }}>
                  {formatCurrency(row.payroll_qre)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', ...monoStyle }}>
                  {formatCurrency(row.supplies_qre)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', ...monoStyle }}>
                  {formatCurrency(row.total_qre)}
                </td>
              </tr>
            ))}
            {/* Grand Total row */}
            <tr>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                }}
              >
                Grand Total
              </td>
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                }}
              >
                {grandTotal.employee_count}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                  ...monoStyle,
                }}
              >
                {formatNumber(grandTotal.total_rd_hours)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                  ...monoStyle,
                }}
              >
                {formatCurrency(grandTotal.payroll_qre)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                  ...monoStyle,
                }}
              >
                {formatCurrency(grandTotal.supplies_qre)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 600,
                  background: '#fdf9f0',
                  borderBottom: 'none',
                  ...monoStyle,
                }}
              >
                {formatCurrency(grandTotal.total_qre)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Nav row */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          ← Back
        </Button>
        <Button
          variant="cherry"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit to Forbes Management ✓'}
        </Button>
      </div>
    </div>
  )
}
