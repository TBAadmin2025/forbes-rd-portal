'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import UploadCategory from '@/components/portal/UploadCategory'
import UploadModal from '@/components/portal/UploadModal'
import type { UploadedFile } from '@/components/portal/UploadCategory'

type Category = 'payroll' | 'pandl' | 'taxid' | 'gross_receipts'
const CATEGORIES: Category[] = ['payroll', 'pandl', 'taxid', 'gross_receipts']

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [files, setFiles] = useState<Record<Category, UploadedFile[]>>({
    payroll: [], pandl: [], taxid: [], gross_receipts: [],
  })
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let subId: string | null = null

      if (sid) {
        subId = sid
      } else {
        const { data: sub } = await supabase
          .from('submissions')
          .select('id')
          .eq('client_user_id', user.id)
          .single()
        if (sub) subId = sub.id
      }

      if (!subId) return
      setSubmissionId(subId)

      // Load existing documents
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('submission_id', subId)

      if (docs) {
        const grouped: Record<Category, UploadedFile[]> = {
          payroll: [], pandl: [], taxid: [], gross_receipts: [],
        }
        for (const d of docs) {
          const cat = d.category as Category
          if (grouped[cat]) {
            grouped[cat].push({ name: d.file_name, year: d.tax_year })
          }
        }
        setFiles(grouped)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalFiles = Object.values(files).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}
        >
          Upload Documents
        </h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
          Upload your supporting documents by category. These are used to verify
          your R&D tax credit claim.
        </div>
      </div>

      <InfoBox>
        <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
          What to upload:
        </strong>{' '}
        Payroll reports, P&L statements, tax ID documents, and gross receipts
        for each applicable year. Accepted formats: PDF, Excel, CSV, and images.
      </InfoBox>

      {/* Category cards */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}
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

      {/* Upload modal */}
      {activeCategory && submissionId && (
        <UploadModal
          category={activeCategory}
          isOpen
          onClose={() => setActiveCategory(null)}
          onFilesUploaded={(newFiles) => {
            setFiles(prev => ({
              ...prev,
              [activeCategory]: [...prev[activeCategory], ...newFiles],
            }))
          }}
          submissionId={submissionId}
        />
      )}

      {/* Status */}
      {totalFiles > 0 && (
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: 'var(--emerald)',
            fontWeight: 500,
          }}
        >
          {totalFiles} document{totalFiles !== 1 ? 's' : ''} uploaded
        </div>
      )}

      {/* Nav */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(portalUrl('/portal/data-entry', sid))}
        >
          ← Back
        </Button>
        <Button
          variant="dark"
          onClick={() => router.push(portalUrl('/portal/review', sid))}
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}
