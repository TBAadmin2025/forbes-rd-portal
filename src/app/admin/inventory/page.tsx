'use client'

// Audit blitz UI. Dense grid optimized for fast triage:
//   - One row per client
//   - One column per (year × requirement) cell
//   - Click a cell to cycle state: unknown → have → n_a → unknown
//     (if cell is currently 'uploaded', click cycles uploaded → n_a → unknown)
//   - Click the year pill to add/remove a year from the client
//   - Notes button opens an inline editor row
//
// State legend:
//   ✓ green   uploaded — derived from real data
//   📥 amber  have     — team confirmed externally, not in portal yet
//   ➖ muted  n_a      — does not apply
//   ?  gray   unknown  — not yet audited
//   —         year not in this client's tax_years

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Tag from '@/components/shared/Tag'
import type { Submission } from '@/lib/types/database.types'
import type {
  RequirementKey,
  RequirementState,
  SubmissionCompleteness,
  YearStatus,
} from '@/lib/inventory/completeness'

const ALL_YEARS = [2022, 2023, 2024, 2025]
const REQUIREMENTS: Array<{ key: RequirementKey; short: string; full: string }> = [
  { key: 'payroll', short: 'P', full: 'Payroll' },
  { key: 'pandl', short: 'L', full: 'P&L' },
  { key: 'qre', short: 'Q', full: 'QRE' },
]

interface InventoryRow {
  id: string
  contact_name: string | null
  company_name: string | null
  contact_email: string | null
  status: Submission['status']
  tax_years: number[]
  admin_notes: string | null
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

// Cycle order:
//   unknown  → have
//   have     → n_a
//   n_a      → unknown
//   uploaded → n_a (override)
function nextState(current: RequirementState): 'have' | 'n_a' | null {
  if (current === 'unknown') return 'have'
  if (current === 'have') return 'n_a'
  if (current === 'uploaded') return 'n_a'
  // n_a → clear (back to derived: unknown or uploaded)
  return null
}

const STATE_VISUAL: Record<RequirementState, { label: string; bg: string; color: string; border: string; title: string }> = {
  uploaded: { label: '✓', bg: 'var(--emerald)', color: 'var(--ivory)', border: 'var(--emerald)', title: 'Uploaded' },
  have: { label: '📥', bg: '#FFF1D7', color: 'var(--charcoal)', border: '#E5C683', title: 'Have it (not uploaded)' },
  n_a: { label: '–', bg: '#F0EBE0', color: 'var(--muted)', border: '#E5DFD2', title: 'Not applicable' },
  unknown: { label: '?', bg: 'transparent', color: 'var(--muted)', border: 'var(--border)', title: 'Unknown — click to mark' },
}

export default function InventoryPage() {
  const router = useRouter()
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompleteness, setFilterCompleteness] = useState<CompletenessFilter>('all')
  const [openNotesId, setOpenNotesId] = useState<string | null>(null)
  const [openYearsId, setOpenYearsId] = useState<string | null>(null)
  const [savingCell, setSavingCell] = useState<string | null>(null)
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

  const updateRowLocal = useCallback((id: string, patch: Partial<InventoryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const toggleYear = useCallback(async (row: InventoryRow, year: number) => {
    const next = row.tax_years.includes(year)
      ? row.tax_years.filter((y) => y !== year)
      : [...row.tax_years, year].sort((a, b) => a - b)
    updateRowLocal(row.id, { tax_years: next })
    await fetch(`/api/submissions/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tax_years: next }),
    })
    reload()
  }, [reload, updateRowLocal])

  const cycleCell = useCallback(async (row: InventoryRow, year: number, key: RequirementKey, current: RequirementState) => {
    const target = nextState(current)
    const cellId = `${row.id}:${year}:${key}`
    setSavingCell(cellId)
    await fetch('/api/admin/audit/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: row.id,
        tax_year: year,
        requirement_key: key,
        state: target, // null clears
      }),
    })
    setSavingCell(null)
    reload()
  }, [reload])

  const saveNotes = useCallback(async (id: string, notes: string) => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    })
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        (r.contact_name || '').toLowerCase().includes(q) ||
        (r.company_name || '').toLowerCase().includes(q) ||
        (r.contact_email || '').toLowerCase().includes(q)

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
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
            Client Inventory
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
            Click a cell to cycle:&nbsp;
            <span style={chipInlineStyle('unknown')}>?</span> →&nbsp;
            <span style={chipInlineStyle('have')}>📥</span> →&nbsp;
            <span style={chipInlineStyle('n_a')}>–</span> → back. Already uploaded cells (<span style={chipInlineStyle('uploaded')}>✓</span>) jump to <span style={chipInlineStyle('n_a')}>–</span>.
          </div>
        </div>
        <div className="flex" style={{ gap: 16 }}>
          <Stat label="Complete" value={stats.complete} tone="emerald" />
          <Stat label="Incomplete" value={stats.incomplete} tone="cherry" />
          <Stat label="No Years" value={stats.noYears} tone="muted" />
          <Stat label="Total" value={stats.total} tone="charcoal" />
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
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
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
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

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--charcoal)' }}>
              <th style={{ ...thStyle, textAlign: 'left', minWidth: 220 }}>Client</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Years</th>
              {ALL_YEARS.map((y) => (
                <th key={y} colSpan={REQUIREMENTS.length} style={{ ...thStyle, textAlign: 'center', borderLeft: '1px solid rgba(240,231,215,0.15)' }}>
                  {y}
                </th>
              ))}
              <th style={{ ...thStyle, textAlign: 'center' }}>Notes</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Open</th>
            </tr>
            <tr style={{ background: 'var(--charcoal)' }}>
              <th />
              <th />
              <th />
              {ALL_YEARS.flatMap((y) =>
                REQUIREMENTS.map((r) => (
                  <th
                    key={`${y}-${r.key}`}
                    title={r.full}
                    style={{
                      ...thStyle,
                      fontSize: 8,
                      letterSpacing: '1px',
                      textAlign: 'center',
                      padding: '4px 0',
                      borderLeft: r.key === 'payroll' ? '1px solid rgba(240,231,215,0.15)' : 'none',
                    }}
                  >
                    {r.short}
                  </th>
                )),
              )}
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5 + ALL_YEARS.length * REQUIREMENTS.length} style={emptyCellStyle}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5 + ALL_YEARS.length * REQUIREMENTS.length} style={emptyCellStyle}>
                  {search || filterStatus !== 'all' || filterCompleteness !== 'all'
                    ? 'No clients match your filters.'
                    : 'No clients yet.'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((r) => {
              const yearStatusByYear: Record<number, YearStatus | undefined> = {}
              for (const ys of r.completeness.years) yearStatusByYear[ys.year] = ys

              const notesOpen = openNotesId === r.id
              const yearsOpen = openYearsId === r.id

              return (
                <ClientRow
                  key={r.id}
                  row={r}
                  yearStatusByYear={yearStatusByYear}
                  notesOpen={notesOpen}
                  yearsOpen={yearsOpen}
                  savingCell={savingCell}
                  onToggleNotes={() => setOpenNotesId(notesOpen ? null : r.id)}
                  onToggleYears={() => setOpenYearsId(yearsOpen ? null : r.id)}
                  onYearToggle={(y) => toggleYear(r, y)}
                  onCellClick={(year, key, current) => cycleCell(r, year, key, current)}
                  onSaveNotes={(notes) => saveNotes(r.id, notes)}
                  onNotesChange={(notes) => updateRowLocal(r.id, { admin_notes: notes })}
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

interface ClientRowProps {
  row: InventoryRow
  yearStatusByYear: Record<number, YearStatus | undefined>
  notesOpen: boolean
  yearsOpen: boolean
  savingCell: string | null
  onToggleNotes: () => void
  onToggleYears: () => void
  onYearToggle: (year: number) => void
  onCellClick: (year: number, key: RequirementKey, current: RequirementState) => void
  onSaveNotes: (notes: string) => void
  onNotesChange: (notes: string) => void
  onOpenWorkspace: () => void
}

function ClientRow({
  row,
  yearStatusByYear,
  notesOpen,
  yearsOpen,
  savingCell,
  onToggleNotes,
  onToggleYears,
  onYearToggle,
  onCellClick,
  onSaveNotes,
  onNotesChange,
  onOpenWorkspace,
}: ClientRowProps) {
  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '10px 14px', minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
            {row.contact_name || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
            {row.company_name || row.contact_email || '—'}
          </div>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <Tag variant={statusVariant(row.status)}>{statusLabel(row.status)}</Tag>
        </td>
        <td style={{ padding: '10px 14px', position: 'relative' }}>
          <button
            onClick={onToggleYears}
            style={yearsPillStyle(row.tax_years.length === 0)}
            title="Click to toggle which years apply"
          >
            {row.tax_years.length === 0 ? 'None ▾' : `${row.tax_years.join(', ')} ▾`}
          </button>
          {yearsOpen && (
            <div style={yearsPopoverStyle}>
              {ALL_YEARS.map((y) => {
                const on = row.tax_years.includes(y)
                return (
                  <button
                    key={y}
                    onClick={() => onYearToggle(y)}
                    style={{
                      ...yearChipStyle,
                      background: on ? 'var(--cherry)' : 'var(--white)',
                      color: on ? 'var(--ivory)' : 'var(--charcoal)',
                      borderColor: on ? 'var(--cherry)' : 'var(--border)',
                    }}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}
        </td>

        {ALL_YEARS.flatMap((year) => {
          const ys = yearStatusByYear[year]
          const inWindow = row.tax_years.includes(year)
          return REQUIREMENTS.map((req, i) => {
            const cellId = `${row.id}:${year}:${req.key}`
            const isSaving = savingCell === cellId
            const state: RequirementState = !inWindow
              ? 'unknown' // year not in window — render placeholder
              : (ys?.states[req.key] ?? 'unknown')
            return (
              <td
                key={`${year}-${req.key}`}
                style={{
                  textAlign: 'center',
                  padding: '6px 4px',
                  borderLeft: i === 0 ? '1px solid var(--border)' : 'none',
                  opacity: isSaving ? 0.4 : 1,
                }}
              >
                {!inWindow ? (
                  <span style={{ fontSize: 11, color: 'var(--border)' }} title="Year not in this client's window">—</span>
                ) : (
                  <button
                    onClick={() => onCellClick(year, req.key, state)}
                    disabled={isSaving}
                    title={`${year} ${req.full} — ${STATE_VISUAL[state].title}`}
                    style={cellButtonStyle(state)}
                  >
                    {STATE_VISUAL[state].label}
                  </button>
                )}
              </td>
            )
          })
        })}

        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
          <button onClick={onToggleNotes} style={iconBtnStyle} title="Open notes">
            {row.admin_notes ? '📝' : '📄'}
          </button>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
          <button onClick={onOpenWorkspace} style={openBtnStyle} title="Open workspace">
            ↗
          </button>
        </td>
      </tr>

      {notesOpen && (
        <tr style={{ background: 'var(--warm)', borderBottom: '1px solid var(--border)' }}>
          <td colSpan={5 + ALL_YEARS.length * REQUIREMENTS.length} style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
              Internal Notes
            </div>
            <textarea
              value={row.admin_notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              onBlur={(e) => onSaveNotes(e.target.value)}
              rows={3}
              placeholder="Anything the team should know about this client…"
              style={{
                width: '100%',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '8px 10px',
                fontSize: 12,
                fontFamily: 'inherit',
                color: 'var(--charcoal)',
                resize: 'vertical',
              }}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'cherry' | 'muted' | 'charcoal' }) {
  const color = {
    emerald: 'var(--emerald)',
    cherry: 'var(--cherry)',
    muted: 'var(--muted)',
    charcoal: 'var(--charcoal)',
  }[tone]
  return (
    <div style={{ minWidth: 80 }}>
      <div className="font-serif" style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--champagne)',
}

const emptyCellStyle: React.CSSProperties = {
  padding: '40px 16px',
  textAlign: 'center',
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 300,
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--cherry)' : 'var(--white)',
    color: active ? 'var(--ivory)' : 'var(--charcoal)',
    border: `1px solid ${active ? 'var(--cherry)' : 'var(--border)'}`,
    padding: '5px 11px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    borderRadius: 100,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

function chipInlineStyle(state: RequirementState): React.CSSProperties {
  const v = STATE_VISUAL[state]
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 4,
    fontSize: 10,
    margin: '0 2px',
    verticalAlign: 'middle',
  }
}

function cellButtonStyle(state: RequirementState): React.CSSProperties {
  const v = STATE_VISUAL[state]
  return {
    width: 26,
    height: 26,
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    padding: 0,
    transition: 'all 0.1s',
  }
}

const yearChipStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: '1px solid',
}

function yearsPillStyle(empty: boolean): React.CSSProperties {
  return {
    background: empty ? 'rgba(108,22,28,0.08)' : 'var(--white)',
    color: empty ? 'var(--cherry)' : 'var(--charcoal)',
    border: `1px solid ${empty ? 'var(--cherry)' : 'var(--border)'}`,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 100,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

const yearsPopoverStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 8,
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  display: 'flex',
  gap: 6,
  zIndex: 10,
}

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 3,
  width: 28,
  height: 28,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: 0,
}

const openBtnStyle: React.CSSProperties = {
  background: 'var(--charcoal)',
  color: 'var(--ivory)',
  border: 'none',
  borderRadius: 3,
  width: 28,
  height: 28,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
