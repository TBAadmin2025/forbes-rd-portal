'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Tag from '@/components/shared/Tag'
import Button from '@/components/shared/Button'
import type { Submission } from '@/lib/types/database.types'

const statusVariant = (s: Submission['status']) => {
  switch (s) {
    case 'internal': return 'internal' as const
    case 'invited': return 'invited' as const
    case 'in_progress': return 'progress' as const
    case 'submitted': return 'submitted' as const
    case 'sent': return 'sent' as const
  }
}

const statusLabel = (s: Submission['status']) => {
  switch (s) {
    case 'internal': return 'Internal'
    case 'invited': return 'Invited'
    case 'in_progress': return 'In Progress'
    case 'submitted': return 'Submitted'
    case 'sent': return 'Sent'
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      !search ||
      (s.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_email || '').toLowerCase().includes(search.toLowerCase())

    const matchesStatus = filterStatus === 'all' || s.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const statuses = ['all', 'internal', 'invited', 'in_progress', 'submitted', 'sent']

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1
            className="font-serif"
            style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}
          >
            All Clients
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
            {submissions.length} total client{submissions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="finput"
          style={{ maxWidth: 320, fontSize: 12 }}
        />
        <div className="flex" style={{ gap: 6 }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 3,
                border: filterStatus === s ? '1.5px solid var(--cherry)' : '1.5px solid var(--border)',
                background: filterStatus === s ? 'rgba(108,22,28,0.06)' : 'var(--white)',
                color: filterStatus === s ? 'var(--cherry)' : 'var(--muted)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 4,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'var(--charcoal)',
              }}
            >
              {['Client', 'Company', 'Email', 'Status', 'Last Active', 'Actions'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: 'var(--champagne)',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 40,
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--muted)',
                    fontWeight: 300,
                  }}
                >
                  {search || filterStatus !== 'all' ? 'No clients match your filters.' : 'No clients yet.'}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr
                key={s.id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => router.push(`/admin/submission/${s.id}`)}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--warm)')}
                onMouseOut={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                  {s.contact_name || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                  {s.company_name || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', fontWeight: 300 }}>
                  {s.contact_email || '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <Tag variant={statusVariant(s.status)}>{statusLabel(s.status)}</Tag>
                    <span
                      title={s.client_user_id ? 'Portal access enabled' : 'No portal access yet'}
                      style={{ fontSize: 12, color: 'var(--muted)' }}
                    >
                      {s.client_user_id ? '👤' : '🔒'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
                  {s.last_active_at
                    ? new Date(s.last_active_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/admin/submission/${s.id}`)
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
