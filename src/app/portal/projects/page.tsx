'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'
import QRAProjectForm from '@/components/portal/QRAProjectForm'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'

export default function ProjectsPage() {
  const router = useRouter()
  const supabase = createClient()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      if (sid) {
        setSubmissionId(sid)
      } else {
        const { data: sub } = await supabase
          .from('submissions')
          .select('id')
          .eq('client_user_id', user.id)
          .single()
        if (sub) setSubmissionId(sub.id)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>Loading...</div>
  }

  if (!submissionId) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>No submission found.</div>
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h2
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}
        >
          R&D Projects
        </h2>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
          Describe each research and development project your company worked on.
          This information is used to qualify your activities for the R&D tax credit.
        </div>
      </div>

      <InfoBox>
        <strong style={{ color: 'var(--cherry)', fontWeight: 600 }}>What counts as an R&D project?</strong>{' '}
        Any work where you developed something new, improved an existing product or process,
        or resolved a technical challenge through experimentation. Include projects even if
        they weren&apos;t successful — the attempt counts.
      </InfoBox>

      <div style={{ marginTop: 20 }}>
        <QRAProjectForm submissionId={submissionId} />
      </div>

      {/* Nav row */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(portalUrl('/portal/upload', sid))}
        >
          ← Back to Documents
        </Button>
        <Button
          variant="dark"
          onClick={() => router.push(portalUrl('/portal/review', sid))}
        >
          Continue to Review →
        </Button>
      </div>
    </div>
  )
}
