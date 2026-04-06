'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'
import Card from '@/components/shared/Card'
import Button from '@/components/shared/Button'
import UploadCategory from '@/components/portal/UploadCategory'
import UploadModal from '@/components/portal/UploadModal'
import ExtractionProgress from '@/components/portal/ExtractionProgress'
import YearBlock from '@/components/portal/YearBlock'
import type { UploadedFile } from '@/components/portal/UploadCategory'
import type { Employee, Supply } from '@/lib/types/database.types'

type Category = 'payroll' | 'pandl' | 'taxid' | 'gross_receipts'

const CATEGORIES: Category[] = ['payroll', 'pandl', 'taxid', 'gross_receipts']
const YEARS = [2025, 2024, 2023, 2022]

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [files, setFiles] = useState<Record<Category, UploadedFile[]>>({
    payroll: [],
    pandl: [],
    taxid: [],
    gross_receipts: [],
  })
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [showExtraction, setShowExtraction] = useState(false)
  const [extractionDone, setExtractionDone] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [employeesByYear, setEmployeesByYear] = useState<Record<number, Employee[]>>({})
  const [suppliesByYear, setSuppliesByYear] = useState<Record<number, Supply[]>>({})

  // Load submission
  useEffect(() => {
    async function load() {
      let submission: { id: string } | null = null

      if (sid) {
        const { data } = await supabase
          .from('submissions')
          .select('id')
          .eq('id', sid)
          .single()
        submission = data
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('submissions')
          .select('id')
          .eq('client_user_id', user.id)
          .single()
        submission = data
      }

      if (submission) {
        setSubmissionId(submission.id)

        // Update submission method
        await supabase
          .from('submissions')
          .update({ submission_method: 'upload' })
          .eq('id', submission.id)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilesUploaded = (category: Category, newFiles: UploadedFile[]) => {
    setFiles((prev) => ({
      ...prev,
      [category]: [...prev[category], ...newFiles],
    }))
    setActiveCategory(null)
  }

  const hasAnyFiles = Object.values(files).some((f) => f.length > 0)

  const loadExtractedData = useCallback(async () => {
    if (!submissionId) return

    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .eq('submission_id', submissionId)

    const { data: sups } = await supabase
      .from('supplies')
      .select('*')
      .eq('submission_id', submissionId)

    if (emps) {
      const byYear: Record<number, Employee[]> = {}
      emps.forEach((e: Employee) => {
        if (!byYear[e.tax_year]) byYear[e.tax_year] = []
        byYear[e.tax_year].push(e)
      })
      setEmployeesByYear(byYear)
    }

    if (sups) {
      const byYear: Record<number, Supply[]> = {}
      sups.forEach((s: Supply) => {
        if (!byYear[s.tax_year]) byYear[s.tax_year] = []
        byYear[s.tax_year].push(s)
      })
      setSuppliesByYear(byYear)
    }
  }, [submissionId, supabase])

  const handleExtractComplete = useCallback(async () => {
    setShowExtraction(false)
    setExtractionDone(true)

    if (!submissionId) return

    // Fetch uploaded document IDs for extraction
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('submission_id', submissionId)
      .in('extraction_status', ['pending'])

    const docIds = (docs || []).map((d: { id: string }) => d.id)

    if (docIds.length > 0) {
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: submissionId,
            document_ids: docIds,
          }),
        })

        if (!res.ok) {
          const errData = await res.json()
          setExtractionError(errData.error || 'Extraction failed')
        }
      } catch {
        setExtractionError('Extraction request failed')
      }
    }

    // Load data regardless (may have been pre-existing or partially extracted)
    await loadExtractedData()
  }, [submissionId, supabase, loadExtractedData])

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Back link */}
      <button
        onClick={() => router.push(portalUrl('/portal/data-entry', sid))}
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

      {/* Upload categories card */}
      <Card>
        <div
          className="font-serif"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 4,
          }}
        >
          Upload Your Documents
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            fontWeight: 300,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Upload files for each category. We'll extract the data automatically.
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          {CATEGORIES.map((cat) => (
            <UploadCategory
              key={cat}
              category={cat}
              files={files[cat]}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Extract button */}
        {hasAnyFiles && !showExtraction && !extractionDone && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button variant="dark" onClick={() => setShowExtraction(true)}>
              Extract Data from Uploads
            </Button>
          </div>
        )}
      </Card>

      {/* Upload modal */}
      {activeCategory && submissionId && (
        <UploadModal
          category={activeCategory}
          isOpen={true}
          onClose={() => setActiveCategory(null)}
          onFilesUploaded={(newFiles) => handleFilesUploaded(activeCategory, newFiles)}
          submissionId={submissionId}
        />
      )}

      {/* Extraction progress */}
      <ExtractionProgress
        isVisible={showExtraction}
        onComplete={handleExtractComplete}
      />

      {/* Extraction error */}
      {extractionError && (
        <div
          style={{
            background: 'rgba(108,22,28,0.05)',
            border: '1px solid rgba(108,22,28,0.15)',
            borderRadius: 3,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 12,
            color: 'var(--cherry)',
          }}
        >
          Some documents could not be extracted automatically. You can still
          review and enter data manually below. ({extractionError})
        </div>
      )}

      {/* QRE table — appears after extraction */}
      {extractionDone && submissionId && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <Card>
            <div
              className="font-serif"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--charcoal)',
                marginBottom: 4,
              }}
            >
              Review Extracted Data
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontWeight: 300,
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              Review and edit the data we extracted from your documents.
              Changes are saved automatically.
            </div>
          </Card>

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
          onClick={() => router.push(portalUrl('/portal/data-entry', sid))}
        >
          ← Back
        </Button>
        <div className="flex items-center" style={{ gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Auto-saved
          </span>
          <Button
            variant="dark"
            onClick={() => router.push(portalUrl('/portal/projects', sid))}
          >
            Continue →
          </Button>
        </div>
      </div>
    </div>
  )
}
