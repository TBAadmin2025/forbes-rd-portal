'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatsRow from '@/components/admin/StatsRow'
import PipelineBoard from '@/components/admin/PipelineBoard'
import ClientCard from '@/components/admin/ClientCard'
import type { Submission } from '@/lib/types/database.types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [firstName, setFirstName] = useState('')

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSubmissions(data as Submission[])
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        const name = profile?.full_name || user.user_metadata?.full_name || ''
        setFirstName(name.split(' ')[0] || 'there')
      }
      await loadSubmissions()
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh when a new client is added
  useEffect(() => {
    const handler = () => loadSubmissions()
    window.addEventListener('refresh-admin-data', handler)
    return () => window.removeEventListener('refresh-admin-data', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = {
    total: submissions.length,
    submitted: submissions.filter((s) => s.status === 'submitted' || s.status === 'in_review').length,
    inProgress: submissions.filter((s) => s.status === 'in_progress').length,
    complete: submissions.filter((s) => s.status === 'complete').length,
    sent: submissions.filter((s) => s.export_sent_at).length,
  }

  const submitted = submissions.filter((s) => s.status === 'submitted' || s.status === 'in_review')

  const handleAddClient = () => {
    window.dispatchEvent(new CustomEvent('open-add-client'))
  }

  return (
    <div>
      {/* Section 1 — Welcome Header */}
      <div style={{ paddingBottom: 32 }}>
        <h1
          className="font-serif"
          style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', margin: 0, lineHeight: 1.2 }}
        >
          {getGreeting()}, {firstName}.
        </h1>
        <p style={{ fontSize: 14, fontWeight: 300, color: 'var(--muted)', marginTop: 6 }}>
          Here&apos;s where things stand today.
        </p>
      </div>

      {/* Section 2 — Stats */}
      <StatsRow stats={stats} />

      {/* Section 3 — Quick Actions */}
      <div style={{ marginTop: 32 }}>
        <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Quick Actions
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--champagne)', opacity: 0.4 }} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {/* Add Client */}
          <button
            onClick={handleAddClient}
            style={{
              background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4,
              padding: 28, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--cherry)' }} />
            <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--cherry)' }}>+</div>
            <div className="font-serif" style={{ fontSize: 18, color: 'var(--charcoal)', marginBottom: 6 }}>Add a New Client</div>
            <div style={{ fontSize: 13, fontWeight: 300, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Invite a client to fill out their R&D information. We&apos;ll send them a welcome email with their login details.
            </div>
            <span style={{ display: 'inline-block', background: 'var(--cherry)', color: 'var(--ivory)', padding: '8px 20px', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Add Client
            </span>
          </button>

          {/* Send to Partner */}
          <button
            onClick={() => router.push('/admin/exports')}
            style={{
              background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4,
              padding: 28, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--emerald)' }} />
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div className="font-serif" style={{ fontSize: 18, color: 'var(--charcoal)', marginBottom: 6 }}>Send to Solutions Made Simple</div>
            <div style={{ fontSize: 13, fontWeight: 300, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Generate the R&D package for a completed client and send it to your partner.
            </div>
            <span style={{ display: 'inline-block', background: 'var(--charcoal)', color: 'var(--ivory)', padding: '8px 20px', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Go to Exports
            </span>
          </button>

          {/* Help */}
          <a
            href="mailto:concierge@quietwealthpartners.com"
            style={{
              background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4,
              padding: 28, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden', textDecoration: 'none', display: 'block',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--champagne)' }} />
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div className="font-serif" style={{ fontSize: 18, color: 'var(--charcoal)', marginBottom: 6 }}>Questions or Issues?</div>
            <div style={{ fontSize: 13, fontWeight: 300, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              Something not working or not sure what to do next? Reach out and we&apos;ll help you.
            </div>
            <span style={{ display: 'inline-block', background: 'transparent', color: 'var(--charcoal)', padding: '8px 20px', borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', border: '1.5px solid var(--border)' }}>
              Contact Support
            </span>
          </a>
        </div>
      </div>

      {/* Section 4 — Needs Your Attention */}
      <div style={{ marginTop: 36 }}>
        <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Needs Your Attention
          </span>
          {submitted.length > 0 && (
            <span style={{ background: 'var(--cherry)', color: 'var(--ivory)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
              {submitted.length}
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: 'var(--champagne)', opacity: 0.4 }} />
        </div>

        {submitted.length > 0 ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {submitted.map((sub) => (
              <ClientCard key={sub.id} submission={sub} onClick={() => router.push(`/admin/submission/${sub.id}`)} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--emerald)', fontWeight: 500, padding: '12px 0' }}>
            You&apos;re all caught up ✓
          </div>
        )}
      </div>

      {/* Section 5 — All Clients Pipeline */}
      <div style={{ marginTop: 36 }}>
        <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            All Clients
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--champagne)', opacity: 0.4 }} />
        </div>

        <PipelineBoard
          submissions={submissions}
          onCardClick={(id) => router.push(`/admin/submission/${id}`)}
        />
      </div>
    </div>
  )
}
