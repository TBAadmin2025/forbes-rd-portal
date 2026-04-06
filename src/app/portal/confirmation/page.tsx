'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmationHero from '@/components/portal/ConfirmationHero'
import InfoBox from '@/components/shared/InfoBox'
import { formatCurrency } from '@/lib/utils/formatting'
import { calcConservativeFederal, calcGeorgiaCredit } from '@/lib/utils/calculations'

interface PageData {
  firstName: string
  totalQRE: number
  federalCredit: number
  georgiaCredit: number
  documents: { file_name: string }[]
}

export default function ConfirmationPage() {
  const supabase = createClient()
  const [data, setData] = useState<PageData | null>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: submission } = await supabase
        .from('submissions')
        .select('id, contact_name')
        .eq('client_user_id', user.id)
        .single()

      if (!submission) return

      const { data: summaries } = await supabase
        .from('qre_summary')
        .select('total_qre')
        .eq('submission_id', submission.id)

      const { data: docs } = await supabase
        .from('documents')
        .select('file_name')
        .eq('submission_id', submission.id)

      const totalQRE = (summaries || []).reduce((s, r) => s + (r.total_qre || 0), 0)
      const federalCredit = calcConservativeFederal(totalQRE)
      const georgiaCredit = calcGeorgiaCredit(federalCredit)

      const firstName = (submission.contact_name || '').split(' ')[0] || 'there'

      setData({
        firstName,
        totalQRE,
        federalCredit,
        georgiaCredit,
        documents: docs || [],
      })
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!data) return null

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <ConfirmationHero
        firstName={data.firstName}
        totalQRE={data.totalQRE}
        federalCredit={data.federalCredit}
        georgiaCredit={data.georgiaCredit}
      />

      {/* Three tiles */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Total QRE', value: data.totalQRE, sub: '2022–2025' },
          { label: 'Est. Federal Credit', value: data.federalCredit, sub: 'Conservative 6%' },
          { label: 'Georgia Credit', value: data.georgiaCredit, sub: '10% of federal' },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: 18,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              {tile.label}
            </div>
            <div
              className="font-serif"
              style={{ fontSize: 26, fontWeight: 700, color: 'var(--cherry)' }}
            >
              {formatCurrency(tile.value)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 3,
                fontWeight: 300,
              }}
            >
              {tile.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Uploaded documents */}
      {data.documents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            Documents Submitted
          </div>
          {data.documents.map((doc, i) => (
            <div
              key={`${doc.file_name}-${i}`}
              className="flex items-center"
              style={{
                gap: 8,
                padding: '9px 13px',
                background: 'var(--em-light)',
                borderRadius: 3,
                marginBottom: 7,
                fontSize: 12,
                color: 'var(--emerald)',
                fontWeight: 500,
              }}
            >
              <span>📄</span>
              <span>{doc.file_name}</span>
            </div>
          ))}
        </div>
      )}

      <InfoBox>
        <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
          Need to make a change?
        </strong>{' '}
        Email admin@forbesmgt.com and we'll reopen your submission.
      </InfoBox>
    </div>
  )
}
