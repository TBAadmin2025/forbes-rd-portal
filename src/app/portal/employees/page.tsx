'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import EmployeesTab from '@/components/admin/EmployeesTab'

export default function PortalEmployeesPage() {
  const router = useRouter()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [taxYears, setTaxYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const url = sid ? `/api/submissions/${sid}` : '/api/submissions'
      const res = await fetch(url)
      if (!res.ok) {
        setLoading(false)
        return
      }
      const sub = await res.json()
      if (!sub?.id) {
        setLoading(false)
        return
      }
      setSubmissionId(sub.id)
      setTaxYears(sub.tax_years || [])
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Loading...</div>
  }

  if (!submissionId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        No submission found.
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <InfoBox>
        <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
          Add everyone who worked on R&D.
        </strong>{' '}
        Add each employee or contractor once. We&apos;ll figure out which years they
        worked from their hire and termination dates. You can also upload a CSV
        of your full team if you have many people.
      </InfoBox>

      <div style={{ marginTop: 20 }}>
        <EmployeesTab submissionId={submissionId} taxYears={taxYears} />
      </div>

      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(portalUrl('/portal/company-info', sid))}>
          ← Back
        </Button>
        <Button
          variant="dark"
          onClick={async () => {
            await fetch(`/api/submissions/${submissionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ current_step: 2 }),
            })
            router.push(portalUrl('/portal/data-entry', sid))
          }}
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}
