'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Tag from '@/components/shared/Tag'
import Button from '@/components/shared/Button'
import type { Submission } from '@/lib/types/database.types'
import type { SubmissionCompleteness, YearStatus } from '@/lib/inventory/completeness'

const ALL_YEARS = [2022, 2023, 2024, 2025]

interface InventoryRow {
  id: string
  contact_name: string | null
  company_name: string | null
  contact_email: string | null
  status: Submission['status']
  tax_years: number[]
  admin_notes: string | null
  last_active_at: string | null
  has_portal_access: boolean
  completeness: SubmissionCompleteness
}

type CompletenessFilter = 'all' | 'complete' | 'incomplete' | 'no_years'

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

export default function InventoryPage() {
  const router = useRouter()
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompleteness, setFilterCompleteness] = useState<CompletenessFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    // Honor #<submission_id> in the URL on first paint so deep links from the
    // dashboard's Inventory Snapshot land on the right row already expanded.
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.replace('#', '')
    return hash || null
  })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const reload = useCallback(() => setRefreshNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/admin/inventory')
      if (cancelled) return
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows ?? [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [refreshNonce])

  const updateRow = useCallback((id: string, patch: Partial<InventoryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const toggleYear = useCallback(async (row: InventoryRow, year: number) => {
    const next = row.tax_years.includes(year)
      ? row.tax_years.filter((y) => y !== year)
      : [...row.tax_years, year].sort((a, b) => a - b)
    setSavingId(row.id)
    const res = await fetch(`/api/submissions/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tax_years: next }),
    })
    setSavingId(null)
    if (res.ok) {
      // Refetch so completeness recomputes against new year set.
      reload()
    }
  }, [reload])

  const saveNotes = useCallback(async (id: string, notes: string) => {
    setSavingId(id)
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    })
    setSavingId(null)
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !search ||
        (r.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.contact_email || '').toLowerCase().includes(search.toLowerCase())

      const matchesStatus = filterStatus === 'all' || r.status === filterStatus

      let matchesCompleteness = true
      if (filterCompleteness === 'complete') matchesCompleteness = r.completeness.complete
      else if (filterCompleteness === 'incomplete') matchesCompleteness = !r.completeness.complete && r.tax_years.length > 0
      else if (filterCompleteness === 'no_years') matchesCompleteness = r.tax_years.length === 0

      return matchesSearch && matchesStatus && matchesCompleteness
    })
  }, [rows, search, filterStatus, filterCompleteness])

  const stats = useMemo(() => {
    const total = rows.length
    const complete = rows.filter((r) => r.completeness.complete).length
    const noYears = rows.filter((r) => r.tax_years.length === 0).length
    return { total, complete, noYears, incomplete: total - complete - noYears }
  }, [rows])

  const statuses = ['all', 'internal', 'invited', 'in_progress', 'submitted', 'sent']

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
            Client Inventory
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
            Audit each client&apos;s required materials per tax year. Click a row to expand.
          </div>
        </div>
        <div className="flex" style={{ gap: 16 }}>
          <Stat label="Complete" value={stats.complete} tone="emerald" />
          <Stat label="Incomplete" value={stats.incomplete} tone="cherry" />
          <Stat label="No Years Set" value={stats.noYears} tone="muted" />
          <Stat label="Total" value={stats.total} tone="charcoal" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center" style={{ gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
              style={chipStyle(filterStatus === s)}
            >
              {s === 'all' ? 'All Statuses' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex" style={{ gap: 6 }}>
          {(['all', 'complete', 'incomplete', 'no_years'] as CompletenessFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterCompleteness(f)}
              style={chipStyle(filterCompleteness === f)}
            >
              {f === 'all' ? 'All' : f === 'complete' ? '✓ Complete' : f === 'incomplete' ? '⚠ Incomplete' : 'No Years'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 4, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--charcoal)' }}>
              {['', 'Client', 'Status', 'Years', 'Completeness', 'Missing', 'Actions'].map((h, i) => (
                <th
                  key={i}
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
            {loading && (
              <tr>
                <td colSpan={7} style={emptyCellStyle}>Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={emptyCellStyle}>
                  {search || filterStatus !== 'all' || filterCompleteness !== 'all'
                    ? 'No clients match your filters.'
                    : 'No clients yet.'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((r) => {
              const expanded = expandedId === r.id
              return (
                <RowGroup
                  key={r.id}
                  row={r}
                  expanded={expanded}
                  saving={savingId === r.id}
                  onToggle={() => setExpandedId(expanded ? null : r.id)}
                  onYearToggle={(y) => toggleYear(r, y)}
                  onNotesChange={(notes) => {
                    updateRow(r.id, { admin_notes: notes })
                  }}
                  onNotesBlur={(notes) => saveNotes(r.id, notes)}
                  onOpenWorkspace={() => router.push(`/admin/submission/${r.id}/workspace`)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RowGroup({
  row,
  expanded,
  saving,
  onToggle,
  onYearToggle,
  onNotesChange,
  onNotesBlur,
  onOpenWorkspace,
}: {
  row: InventoryRow
  expanded: boolean
  saving: boolean
  onToggle: () => void
  onYearToggle: (y: number) => void
  onNotesChange: (notes: string) => void
  onNotesBlur: (notes: string) => void
  onOpenWorkspace: () => void
}) {
  const c = row.completeness
  const fraction = c.totalYears === 0 ? 0 : c.completeYears / c.totalYears
  const tone = c.complete ? 'var(--emerald)' : c.totalYears === 0 ? 'var(--muted)' : 'var(--cherry)'

  return (
    <>
      <tr
        style={{
          borderBottom: expanded ? 'none' : '1px solid var(--border)',
          cursor: 'pointer',
          background: expanded ? 'var(--warm)' : 'transparent',
        }}
        onClick={onToggle}
      >
        <td style={{ padding: '12px 16px', width: 24, color: 'var(--muted)', fontSize: 11 }}>
          {expanded ? '▾' : '▸'}
        </td>
        <td style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
            {row.contact_name || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
            {row.company_name || row.contact_email || '—'}
          </div>
        </td>
        <td style={{ padding: '12px 16px' }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Tag variant={statusVariant(row.status)}>{statusLabel(row.status)}</Tag>
            <span title={row.has_portal_access ? 'Portal access enabled' : 'No portal access'} style={{ fontSize: 12, color: 'var(--muted)' }}>
              {row.has_portal_access ? '👤' : '🔒'}
            </span>
          </div>
        </td>
        <td style={{ padding: '12px 16px' }}>
          {row.tax_years.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--cherry)', fontWeight: 600 }}>None set</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
              {row.tax_years.join(' · ')}
            </span>
          )}
        </td>
        <td style={{ padding: '12px 16px', minWidth: 160 }}>
          <ProgressBar fraction={fraction} tone={tone} />
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            {c.completeYears}/{c.totalYears} years complete
          </div>
        </td>
        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)', maxWidth: 240 }}>
          {c.complete ? (
            <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>✓ All required items present</span>
          ) : c.missing.length === 0 ? (
            '—'
          ) : (
            <span>
              {c.missing.slice(0, 3).join(', ')}
              {c.missing.length > 3 ? ` +${c.missing.length - 3} more` : ''}
            </span>
          )}
        </td>
        <td style={{ padding: '12px 16px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpenWorkspace() }}
          >
            Open
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--warm)' }}>
          <td colSpan={7} style={{ padding: '0 16px 18px 40px' }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 24, paddingTop: 4 }}>
              <div>
                <SectionLabel>Tax Years (click to toggle)</SectionLabel>
                <div className="flex" style={{ gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {ALL_YEARS.map((y) => {
                    const on = row.tax_years.includes(y)
                    return (
                      <button
                        key={y}
                        onClick={() => onYearToggle(y)}
                        disabled={saving}
                        style={yearChipStyle(on, saving)}
                      >
                        {on ? '✓ ' : ''}{y}
                      </button>
                    )
                  })}
                </div>

                <SectionLabel>Per-Year Status</SectionLabel>
                {row.tax_years.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                    No tax years selected. Toggle one above to begin auditing.
                  </div>
                ) : (
                  <YearMatrix years={c.years} />
                )}
              </div>

              <div>
                <SectionLabel>Internal Notes</SectionLabel>
                <textarea
                  className="finput"
                  rows={6}
                  value={row.admin_notes ?? ''}
                  onChange={(e) => onNotesChange(e.target.value)}
                  onBlur={(e) => onNotesBlur(e.target.value)}
                  placeholder="Notes only your team can see…"
                  style={{ resize: 'vertical', fontSize: 12 }}
                />
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                  Saves on blur.
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function YearMatrix({ years }: { years: YearStatus[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={matrixHeadStyle}>Year</th>
          <th style={matrixHeadStyle}>Payroll</th>
          <th style={matrixHeadStyle}>P&L</th>
          <th style={matrixHeadStyle}>QRE</th>
          <th style={matrixHeadStyle}>Receipts (opt)</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y) => (
          <tr key={y.year} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={matrixCellStyle}>
              <span style={{ fontWeight: 600, color: y.complete ? 'var(--emerald)' : 'var(--cherry)' }}>
                {y.year}
              </span>
            </td>
            <td style={matrixCellStyle}>{checkmark(y.payroll)}</td>
            <td style={matrixCellStyle}>{checkmark(y.pandl)}</td>
            <td style={matrixCellStyle}>
              {y.qre ? (
                <span title={y.qreSource === 'spreadsheet' ? 'Legacy QRE spreadsheet' : 'Employee data entered'}>
                  {y.qreSource === 'spreadsheet' ? '📑' : '✓'}
                </span>
              ) : (
                <span style={{ color: 'var(--cherry)' }}>—</span>
              )}
            </td>
            <td style={matrixCellStyle}>{y.grossReceipts ? '✓' : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function checkmark(ok: boolean) {
  return ok
    ? <span style={{ color: 'var(--emerald)' }}>✓</span>
    : <span style={{ color: 'var(--cherry)' }}>—</span>
}

function ProgressBar({ fraction, tone }: { fraction: number; tone: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.round(fraction * 100)}%`, height: '100%', background: tone, transition: 'width 0.2s' }} />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'cherry' | 'muted' | 'charcoal' }) {
  const colorMap = {
    emerald: 'var(--emerald)',
    cherry: 'var(--cherry)',
    muted: 'var(--muted)',
    charcoal: 'var(--charcoal)',
  }
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: colorMap[tone], lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 3,
    border: active ? '1.5px solid var(--cherry)' : '1.5px solid var(--border)',
    background: active ? 'rgba(108,22,28,0.06)' : 'var(--white)',
    color: active ? 'var(--cherry)' : 'var(--muted)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}

function yearChipStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 3,
    border: active ? '2px solid var(--emerald)' : '1.5px solid var(--border)',
    background: active ? 'var(--em-light)' : 'var(--white)',
    color: active ? 'var(--emerald)' : 'var(--muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'wait' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  }
}

const matrixHeadStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  textAlign: 'left',
}

const matrixCellStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
}

const emptyCellStyle: React.CSSProperties = {
  padding: 40,
  textAlign: 'center',
  fontSize: 13,
  color: 'var(--muted)',
  fontWeight: 300,
}
