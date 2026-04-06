'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import YearBlock from '@/components/portal/YearBlock'
import type { Employee, Supply } from '@/lib/types/database.types'

const YEARS = [2025, 2024, 2023, 2022]

export default function ManualPage() {
  const router = useRouter()
  const supabase = createClient()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [employeesByYear, setEmployeesByYear] = useState<Record<number, Employee[]>>({})
  const [suppliesByYear, setSuppliesByYear] = useState<Record<number, Supply[]>>({})

  useEffect(() => {
    async function load() {
      console.log('manual: loading...')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      console.log('manual: user =', user?.id ?? 'null')
      if (!user) {
        setLoading(false)
        return
      }

      // Try to find existing submission via API (bypasses RLS)
      console.log('manual: fetching submission via API...')
      const getRes = await fetch('/api/submissions')
      let submission: { id: string } | null = null

      if (getRes.ok) {
        const sub = await getRes.json()
        if (sub?.id) submission = sub
        console.log('manual: existing submission =', sub?.id ?? 'null')
      } else {
        console.log('manual: GET /api/submissions status =', getRes.status)
      }

      // If no submission exists, create one via API (bypasses RLS)
      if (!submission) {
        console.log('manual: creating new submission via API...')
        const postRes = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_name: user.user_metadata?.full_name || '',
            contact_email: user.email || '',
            status: 'in_progress',
            submission_method: 'manual',
          }),
        })
        const resText = await postRes.text()
        console.log('manual: POST response status =', postRes.status, 'body =', resText)

        try {
          const newSub = JSON.parse(resText)
          if (newSub?.id) submission = newSub
        } catch { /* ignore */ }
      }

      if (!submission) {
        console.log('manual: still no submission — giving up')
        setLoading(false)
        return
      }

      console.log('manual: submissionId =', submission.id)

      // Load existing data via API (bypasses RLS) BEFORE setting submissionId
      const [empRes, supRes] = await Promise.all([
        fetch(`/api/employees?submission_id=${submission.id}`),
        fetch(`/api/supplies?submission_id=${submission.id}`),
      ])

      const emps: Employee[] = empRes.ok ? await empRes.json() : []
      const sups: Supply[] = supRes.ok ? await supRes.json() : []

      console.log('manual: loaded', emps.length, 'employees,', sups.length, 'supplies')

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

      // Set all state at once so YearBlocks mount with data already available
      setEmployeesByYear(empByYear)
      setSuppliesByYear(supByYear)
      setSubmissionId(submission.id)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/portal/data-entry')}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 12,
          color: 'var(--muted)',
          cursor: 'pointer',
          marginBottom: 20,
          fontWeight: 300,
          padding: 0,
        }}
      >
        ← Choose a different option
      </button>

      <InfoBox>
        <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
          One year at a time.
        </strong>{' '}
        For each year below, enter everyone who worked on R&D and any qualifying
        supply expenses. R&D hours and qualified amounts are calculated
        automatically as you type. Changes are saved automatically.
      </InfoBox>

      {submissionId && (
        <div style={{ marginTop: 20 }}>
          {YEARS.map((year) => (
            <YearBlock
              key={year}
              year={year}
              submissionId={submissionId}
              initialEmployees={employeesByYear[year] || []}
              initialSupplies={suppliesByYear[year] || []}
              defaultExpanded={year === 2025}
            />
          ))}
        </div>
      )}

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
          onClick={() => router.push('/portal/data-entry')}
        >
          ← Back
        </Button>
        <div className="flex items-center" style={{ gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Auto-saved
          </span>
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
              router.push('/portal/review')
            }}
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  )
}
