'use client'

// Upload Queue: items the team marked as 'have' (we have it externally)
// but haven't uploaded to the portal yet. One row per (client, year,
// requirement) — click "Open" to jump to the client's workspace where
// the actual upload lives. Once uploaded, the item disappears from the
// queue automatically (uploaded > have).

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Tag from '@/components/shared/Tag'
import type { Submission } from '@/lib/types/database.types'
import { REQUIREMENT_LABELS, type RequirementKey } from '@/lib/inventory/completeness'

interface QueueRow {
  submission_id: string
  contact_name: string | null
  company_name: string | null
  contact_email: string | null
  status: Submission['status'] | null
  tax_year: number
  requirement_key: RequirementKey
  marked_at: string | null
  notes: string | null
}

const statusVariant = (s: Submission['status'] | null) => {
  if (!s) return 'internal' as const
  switch (s) {
    case 'internal': return 'internal' as const
    case 'invited': return 'invited' as const
    case 'in_progress': return 'progress' as const
    case 'submitted': return 'submitted' as const
    case 'sent': return 'sent' as const
  }
}

const statusLabel = (s: Submission['status'] | null) => {
  if (!s) return '—'
  switch (s) {
    case 'internal': return 'Internal'
    case 'invited': return 'Invited'
    case 'in_progress': return 'In Progress'
    case 'submitted': return 'Submitted'
    case 'sent': return 'Sent'
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const ms = Date.now() - d.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export default function UploadQueuePage() {
  const router = useRouter()
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/upload-queue')
    if (res.ok) {
      const data = await res.json()
      setRows(data.rows ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const clearMark = useCallback(async (row: QueueRow) => {
    await fetch('/api/admin/audit/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: row.submission_id,
        tax_year: row.tax_year,
        requirement_key: row.requirement_key,
        state: null,
      }),
    })
    load()
  }, [load])

  const filtered = rows.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (r.contact_name || '').toLowerCase().includes(q) ||
      (r.company_name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
          Upload Queue
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4, lineHeight: 1.6 }}>
          Items the team marked as &quot;have&quot; but haven&apos;t uploaded yet. {rows.length} pending.
          <br />
          Each row points to a client&apos;s workspace where the upload lives. Once a file is uploaded for the (year, requirement), the row disappears here automatically.
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by client name or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="finput"
          style={{ maxWidth: 320, fontSize: 12 }}
        />
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--charcoal)' }}>
              {['Client', 'Status', 'Year', 'Requirement', 'Marked', 'Notes', ''].map((h, i) => (
                <th key={i} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={emptyCellStyle}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...emptyCellStyle, color: rows.length === 0 ? 'var(--emerald)' : 'var(--muted)', fontWeight: rows.length === 0 ? 500 : 300 }}>
                  {rows.length === 0
                    ? '✓ No pending uploads — every "have it" item is in the portal.'
                    : 'No items match your search.'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={`${r.submission_id}:${r.tax_year}:${r.requirement_key}`} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                    {r.contact_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
                    {r.company_name || r.contact_email || '—'}
                  </div>
                </td>
                <td style={tdStyle}>
                  <Tag variant={statusVariant(r.status)}>{statusLabel(r.status)}</Tag>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{r.tax_year}</td>
                <td style={tdStyle}>{REQUIREMENT_LABELS[r.requirement_key] ?? r.requirement_key}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11 }}>{timeAgo(r.marked_at)}</td>
                <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes ?? undefined}>
                  {r.notes || '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div className="flex" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => clearMark(r)}
                      style={ghostBtnStyle}
                      title="Remove from queue without uploading"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => router.push(`/admin/submission/${r.submission_id}/workspace`)}
                      style={primaryBtnStyle}
                    >
                      Open ↗
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--champagne)',
  textAlign: 'left',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 12,
  color: 'var(--charcoal)',
}

const emptyCellStyle: React.CSSProperties = {
  padding: '40px 16px',
  textAlign: 'center',
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 300,
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '5px 11px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--charcoal)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--charcoal)',
  border: '1px solid var(--charcoal)',
  borderRadius: 3,
  padding: '5px 11px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--ivory)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
