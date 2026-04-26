'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SubmissionCompleteness } from '@/lib/inventory/completeness'
import type { Submission } from '@/lib/types/database.types'

interface InventoryRow {
  id: string
  contact_name: string | null
  company_name: string | null
  status: Submission['status']
  tax_years: number[]
  completeness: SubmissionCompleteness
}

const ALL_YEARS = [2022, 2023, 2024, 2025]

export default function InventorySnapshot() {
  const router = useRouter()
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/admin/inventory')
      if (cancelled) return
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows ?? [])
      }
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const total = rows.length
    const complete = rows.filter((r) => r.completeness.complete).length
    const noYears = rows.filter((r) => r.tax_years.length === 0).length
    return { total, complete, incomplete: total - complete - noYears, noYears }
  }, [rows])

  // Per-year health: count clients opted-in per year + how many of those are complete-for-that-year.
  const yearHealth = useMemo(() => {
    return ALL_YEARS.map((year) => {
      let optedIn = 0
      let completeForYear = 0
      for (const r of rows) {
        if (!r.tax_years.includes(year)) continue
        optedIn += 1
        const ys = r.completeness.years.find((y) => y.year === year)
        if (ys?.complete) completeForYear += 1
      }
      return {
        year,
        optedIn,
        complete: completeForYear,
        incomplete: optedIn - completeForYear,
      }
    })
  }, [rows])

  // Needs attention: clients with the most missing items, capped at 7.
  // Skip clients that are already complete and clients with no years set
  // (those are a different problem and surface in the scorecard).
  const needsAttention = useMemo(() => {
    return rows
      .filter((r) => r.tax_years.length > 0 && !r.completeness.complete)
      .map((r) => ({ row: r, gapCount: r.completeness.missing.length }))
      .sort((a, b) => b.gapCount - a.gapCount)
      .slice(0, 7)
  }, [rows])

  return (
    <div style={{ marginBottom: 36 }}>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Inventory Snapshot
        </span>
        <button
          onClick={() => router.push('/admin/inventory')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--cherry)',
            cursor: 'pointer',
          }}
        >
          Open Inventory →
        </button>
        <div style={{ flex: 1, height: 1, background: 'var(--champagne)', opacity: 0.4 }} />
      </div>

      {/* A. Scorecard strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <ScoreCard
          value={stats.total}
          label="All Clients"
          sub="In the portal"
          tone="charcoal"
        />
        <ScoreCard
          value={stats.complete}
          label="Complete"
          sub="All required materials in"
          tone="emerald"
        />
        <ScoreCard
          value={stats.incomplete}
          label="Needs Items"
          sub="Missing at least one item"
          tone="cherry"
        />
        <ScoreCard
          value={stats.noYears}
          label="No Years Set"
          sub="Audit hasn't started"
          tone="muted"
        />
      </div>

      {/* B + D side by side on wide screens, stacked on narrow */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 14 }}>
        {/* B. Year health */}
        <div style={cardStyle}>
          <SectionHead>Year Health</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {yearHealth.map((y) => (
              <YearHealthRow key={y.year} {...y} loaded={loaded} />
            ))}
          </div>
        </div>

        {/* D. Needs attention */}
        <div style={cardStyle}>
          <SectionHead>
            Needs Attention
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: 'normal', textTransform: 'none' }}>
              {needsAttention.length === 0 ? '— all caught up' : `top ${needsAttention.length}`}
            </span>
          </SectionHead>
          {!loaded ? (
            <div style={emptyStyle}>Loading…</div>
          ) : needsAttention.length === 0 ? (
            <div style={{ ...emptyStyle, color: 'var(--emerald)', fontWeight: 500 }}>
              ✓ Every client with years set is complete
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {needsAttention.map(({ row, gapCount }) => (
                <NeedsAttentionRow
                  key={row.id}
                  row={row}
                  gapCount={gapCount}
                  onOpen={() => router.push(`/admin/inventory#${row.id}`)}
                  onWorkspace={() => router.push(`/admin/submission/${row.id}/workspace`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreCard({ value, label, sub, tone }: { value: number; label: string; sub: string; tone: 'charcoal' | 'emerald' | 'cherry' | 'muted' }) {
  const borderTone = {
    charcoal: 'var(--charcoal)',
    emerald: 'var(--emerald)',
    cherry: 'var(--cherry)',
    muted: 'var(--muted)',
  }[tone]
  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '18px 20px',
        borderTop: `3px solid ${borderTone}`,
      }}
    >
      <div className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--charcoal)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 5, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontWeight: 300 }}>
        {sub}
      </div>
    </div>
  )
}

function YearHealthRow({ year, optedIn, complete, incomplete, loaded }: { year: number; optedIn: number; complete: number; incomplete: number; loaded: boolean }) {
  const fraction = optedIn === 0 ? 0 : complete / optedIn
  const completeWidth = `${Math.round(fraction * 100)}%`

  return (
    <div>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{year}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
          {!loaded ? '…' : optedIn === 0 ? 'No clients opted in' : `${complete} of ${optedIn} complete`}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          background: 'var(--border)',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {optedIn > 0 ? (
          <>
            <div
              style={{
                width: completeWidth,
                background: 'var(--emerald)',
                transition: 'width 0.3s ease',
              }}
              title={`${complete} complete`}
            />
            <div
              style={{
                flex: 1,
                background: incomplete > 0 ? 'var(--cherry)' : 'transparent',
                opacity: 0.85,
              }}
              title={`${incomplete} incomplete`}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}

function NeedsAttentionRow({
  row,
  gapCount,
  onOpen,
  onWorkspace,
}: {
  row: InventoryRow
  gapCount: number
  onOpen: () => void
  onWorkspace: () => void
}) {
  const c = row.completeness
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: 'var(--warm)',
        border: '1px solid var(--border)',
        borderRadius: 3,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.contact_name || row.company_name || '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2 }}>
          {row.company_name && row.contact_name ? row.company_name : null}
        </div>
      </div>

      {/* Per-year dot grid: 4 requirements stacked vertically × N years horizontally */}
      <DotGrid years={c.years} />

      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 100,
          background: 'var(--cherry)',
          color: 'var(--ivory)',
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}
        title={`${gapCount} missing item${gapCount !== 1 ? 's' : ''}`}
      >
        {gapCount} gap{gapCount !== 1 ? 's' : ''}
      </span>

      <div className="flex" style={{ gap: 4, flexShrink: 0 }}>
        <button onClick={onOpen} style={miniBtnStyle}>Audit</button>
        <button onClick={onWorkspace} style={{ ...miniBtnStyle, background: 'var(--charcoal)', color: 'var(--ivory)' }}>Open</button>
      </div>
    </div>
  )
}

function DotGrid({ years }: { years: SubmissionCompleteness['years'] }) {
  if (years.length === 0) return null
  const reqs: Array<{ key: 'payroll' | 'pandl' | 'qre'; label: string }> = [
    { key: 'payroll', label: 'Payroll' },
    { key: 'pandl', label: 'P&L' },
    { key: 'qre', label: 'QRE' },
  ]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `auto repeat(${years.length}, 14px)`,
        gridTemplateRows: 'auto repeat(3, 14px)',
        gap: 3,
        flexShrink: 0,
      }}
      title="Per-year requirement status"
    >
      <div />
      {years.map((y) => (
        <div
          key={`h-${y.year}`}
          style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', fontWeight: 600 }}
        >
          {String(y.year).slice(2)}
        </div>
      ))}
      {reqs.map((r) => (
        <RequirementRow key={r.key} req={r} years={years} />
      ))}
    </div>
  )
}

function RequirementRow({
  req,
  years,
}: {
  req: { key: 'payroll' | 'pandl' | 'qre'; label: string }
  years: SubmissionCompleteness['years']
}) {
  return (
    <>
      <div
        style={{
          fontSize: 9,
          color: 'var(--muted)',
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          alignSelf: 'center',
          paddingRight: 4,
        }}
      >
        {req.label}
      </div>
      {years.map((y) => {
        const ok = y[req.key]
        return (
          <div
            key={`${req.key}-${y.year}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: ok ? 'var(--emerald)' : 'var(--cherry)',
              opacity: ok ? 0.85 : 0.55,
              alignSelf: 'center',
              justifySelf: 'center',
            }}
            title={`${y.year} ${req.label}: ${ok ? 'present' : 'missing'}`}
          />
        )
      })}
    </>
  )
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '18px 20px',
}

const emptyStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 300,
  padding: '12px 0',
}

const miniBtnStyle: React.CSSProperties = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '5px 10px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--charcoal)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}
