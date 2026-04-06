'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatsRow from '@/components/admin/StatsRow'
import PipelineBoard from '@/components/admin/PipelineBoard'
import type { Submission } from '@/lib/types/database.types'

export default function PipelinePage() {
  const router = useRouter()
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setSubmissions(data as Submission[])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = {
    total: submissions.length,
    invited: submissions.filter((s) => s.status === 'invited').length,
    inProgress: submissions.filter((s) => s.status === 'in_progress').length,
    complete: submissions.filter((s) => s.status === 'complete').length,
  }

  return (
    <div>
      <StatsRow stats={stats} />

      {/* Pipeline header */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 20 }}
      >
        <div
          className="font-serif"
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)' }}
        >
          Client Pipeline
        </div>
      </div>

      <PipelineBoard
        submissions={submissions}
        onCardClick={(id) => router.push(`/admin/submission/${id}`)}
      />
    </div>
  )
}
