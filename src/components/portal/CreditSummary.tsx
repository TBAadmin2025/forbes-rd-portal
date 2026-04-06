'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcConservativeFederal, calcASCFederal, calcGeorgiaCredit } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatting'

interface CreditSummaryProps {
  submissionId: string
}

interface SummaryData {
  totalQRE: number
  companyName: string
  fein: string
  state: string
  conservativeFederal: number
  ascFederal: number
  georgiaCredit: number
}

export default function CreditSummary({ submissionId }: CreditSummaryProps) {
  const supabase = createClient()
  const [data, setData] = useState<SummaryData | null>(null)

  useEffect(() => {
    async function load() {
      // Fetch QRE summary
      const { data: summaries } = await supabase
        .from('qre_summary')
        .select('*')
        .eq('submission_id', submissionId)

      // Fetch submission for company info
      const { data: submission } = await supabase
        .from('submissions')
        .select('company_name, fein, business_state')
        .eq('id', submissionId)
        .single()

      if (!summaries || !submission) return

      const totalQRE = summaries.reduce((sum, s) => sum + (s.total_qre || 0), 0)

      // Build QRE by year for ASC calculation
      const qreByYear: Record<number, number> = {}
      summaries.forEach((s) => {
        if (s.tax_year) qreByYear[s.tax_year] = s.total_qre || 0
      })

      // Use 2025 as current year for credit calculation
      const currentQRE = qreByYear[2025] || 0
      const prior3Avg = ([2024, 2023, 2022].map((y) => qreByYear[y] || 0).reduce((a, b) => a + b, 0)) / 3

      const conservativeFederal = calcConservativeFederal(totalQRE)
      const ascFederal = calcASCFederal(currentQRE, prior3Avg)
      const georgiaCredit = calcGeorgiaCredit(conservativeFederal)

      setData({
        totalQRE,
        companyName: submission.company_name || '',
        fein: submission.fein || '',
        state: submission.business_state || '',
        conservativeFederal,
        ascFederal,
        georgiaCredit,
      })
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  if (!data) return null

  return (
    <div
      style={{
        background: 'var(--charcoal)',
        borderRadius: 4,
        padding: 36,
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* FM pattern */}
      <div
        className="fm-pattern absolute inset-0 pointer-events-none"
        style={{ opacity: 0.12 }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top section: two columns */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gap: 28,
            marginBottom: 28,
            paddingBottom: 28,
            borderBottom: '1px solid rgba(240,231,215,0.08)',
          }}
        >
          {/* Left: Total QRE */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(240,231,215,0.7)',
                marginBottom: 8,
              }}
            >
              Total QRE
            </div>
            <div
              className="font-serif"
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: 'var(--champagne)',
                lineHeight: 1,
              }}
            >
              {formatCurrency(data.totalQRE)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(240,231,215,0.55)',
                marginTop: 6,
                fontWeight: 300,
              }}
            >
              2022–2025 combined
            </div>
          </div>

          {/* Right: Submission details */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(240,231,215,0.7)',
                marginBottom: 12,
              }}
            >
              Your Submission
            </div>
            {[
              { label: 'Company', value: data.companyName },
              { label: 'FEIN', value: data.fein },
              { label: 'State', value: data.state },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between"
                style={{
                  padding: '7px 0',
                  borderBottom: '1px solid rgba(240,231,215,0.06)',
                  fontSize: 13,
                  fontWeight: 300,
                  color: 'rgba(240,231,215,0.65)',
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: 'var(--ivory)', fontWeight: 500 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit breakdown: 3 columns */}
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
        >
          {[
            {
              label: 'Conservative Federal',
              value: data.conservativeFederal,
              method: '6% method',
            },
            {
              label: 'Full ASC Federal',
              value: data.ascFederal,
              method: '14% method',
            },
            {
              label: 'Georgia State',
              value: data.georgiaCredit,
              method: '10% of federal',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                textAlign: 'center',
                padding: 16,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'rgba(240,231,215,0.65)',
                  marginBottom: 6,
                }}
              >
                {item.label}
              </div>
              <div
                className="font-serif"
                style={{ fontSize: 22, fontWeight: 600, color: 'var(--champagne)' }}
              >
                {formatCurrency(item.value)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(240,231,215,0.55)',
                  marginTop: 4,
                  fontWeight: 300,
                }}
              >
                {item.method}
              </div>
            </div>
          ))}
        </div>

        {/* Credit note */}
        <div
          style={{
            fontSize: 11,
            color: 'rgba(240,231,215,0.5)',
            marginTop: 20,
            textAlign: 'center',
            fontStyle: 'italic',
            fontWeight: 300,
          }}
        >
          Estimates only. Final amounts subject to IRS review and professional tax
          preparation.
        </div>
      </div>
    </div>
  )
}
