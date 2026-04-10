'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import YearBlock from '@/components/portal/YearBlock'
import type { Employee, Supply, QRAActivity } from '@/lib/types/database.types'

export default function DataEntryPage() {
  const router = useRouter()
  const supabase = createClient()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [taxYears, setTaxYears] = useState<number[]>([])
  const [qraActivities, setQraActivities] = useState<QRAActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [employeesByYear, setEmployeesByYear] = useState<Record<number, Employee[]>>({})
  const [suppliesByYear, setSuppliesByYear] = useState<Record<number, Supply[]>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const getRes = await fetch(sid ? `/api/submissions/${sid}` : '/api/submissions')
      let submission: { id: string; tax_years?: number[] } | null = null

      if (getRes.ok) {
        const sub = await getRes.json()
        if (sub?.id) submission = sub
      }

      if (!submission) {
        const postRes = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_name: user.user_metadata?.full_name || '',
            contact_email: user.email || '',
            status: 'in_progress',
          }),
        })
        try {
          const newSub = await postRes.json()
          if (newSub?.id) submission = newSub
        } catch { /* ignore */ }
      }

      if (!submission) { setLoading(false); return }

      const [empRes, supRes, qraRes] = await Promise.all([
        fetch(`/api/employees?submission_id=${submission.id}`),
        fetch(`/api/supplies?submission_id=${submission.id}`),
        fetch(`/api/qra-activities?submission_id=${submission.id}`),
      ])

      const emps: Employee[] = empRes.ok ? await empRes.json() : []
      const sups: Supply[] = supRes.ok ? await supRes.json() : []
      const qra: QRAActivity[] = qraRes.ok ? await qraRes.json() : []
      setQraActivities(qra)

      const empByYear: Record<number, Employee[]> = {}
      emps.forEach((e) => {
        if (!empByYear[e.tax_year]) empByYear[e.tax_year] = []
        empByYear[e.tax_year].push(e)
      })

      const supByYear: Record<number, Supply[]> = {}
      sups.forEach((s) => {
        if (!supByYear[s.tax_year]) supByYear[s.tax_year] = []
        supByYear[s.tax_year].push(s)
      })

      const years = (submission.tax_years && submission.tax_years.length > 0)
        ? [...submission.tax_years].sort((a, b) => b - a)
        : [2025, 2024, 2023, 2022]

      setEmployeesByYear(empByYear)
      setSuppliesByYear(supByYear)
      setTaxYears(years)
      setSubmissionId(submission.id)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, padding: 40 }}>Loading...</div>
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}
        >
          Employee & Expense Data
        </h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
          Enter your employees, contractors, and qualifying R&D expenses for each tax year.
        </div>
      </div>

      <InfoBox>
        <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
          One year at a time.
        </strong>{' '}
        For each year below, add everyone who worked on R&D and any qualifying
        supply expenses. R&D hours and qualified amounts calculate automatically.
        Changes save as you type.
      </InfoBox>

      {qraActivities.length === 0 && (
        <div
          className="flex items-center"
          style={{
            gap: 12,
            padding: '12px 18px',
            marginTop: 16,
            background: 'rgba(226,196,155,0.12)',
            border: '1px solid rgba(226,196,155,0.3)',
            borderLeft: '4px solid var(--champagne)',
            borderRadius: '0 4px 4px 0',
          }}
        >
          <span style={{ fontSize: 18 }}>🔬</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>
              R&D projects pending
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
              Forbes Management is setting up your R&D project list. You can add employees and expenses now — project assignment will be available once the QRA is ready.
            </div>
          </div>
        </div>
      )}

      {qraActivities.length > 0 && (
        <div
          className="flex items-center"
          style={{
            gap: 10,
            padding: '10px 16px',
            marginTop: 16,
            background: 'rgba(0,79,53,0.04)',
            border: '1px solid rgba(0,79,53,0.15)',
            borderRadius: 4,
          }}
        >
          <span style={{ color: 'var(--emerald)', fontSize: 14, fontWeight: 700 }}>✓</span>
          <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 500 }}>
            {qraActivities.length} R&D project{qraActivities.length !== 1 ? 's' : ''} available for assignment
          </span>
        </div>
      )}

      {submissionId && (
        <div style={{ marginTop: 16 }}>
          {taxYears.map((year, idx) => (
            <YearBlock
              key={year}
              year={year}
              submissionId={submissionId}
              initialEmployees={employeesByYear[year] || []}
              initialSupplies={suppliesByYear[year] || []}
              qraActivities={qraActivities}
              defaultExpanded={idx === 0}
            />
          ))}
        </div>
      )}

      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(portalUrl('/portal/company-info', sid))}
        >
          ← Back
        </Button>
        <div className="flex items-center" style={{ gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Auto-saved</span>
          <Button
            variant="dark"
            onClick={async () => {
              if (submissionId) {
                await fetch(`/api/submissions/${submissionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ current_step: 3 }),
                })
              }
              router.push(portalUrl('/portal/upload', sid))
            }}
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  )
}
