'use client'

import { useState } from 'react'

interface Specialist {
  initials: string
  name: string
  badge: string
  calendlyUrl: string
}

const DISCOVERY_SPECIALISTS: Specialist[] = [
  {
    initials: 'TH',
    name: 'Tyler Hudson',
    badge: 'R&D Specialist',
    calendlyUrl: 'https://calendly.com/tyler-solutionsmadesimple/30min?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
  },
  {
    initials: 'RA',
    name: 'Reagan Allen',
    badge: 'R&D Specialist',
    calendlyUrl: 'https://calendly.com/reagan-solutionsmadesimple/30min?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
  },
  {
    initials: 'KW',
    name: 'Kyle Williams',
    badge: 'R&D Specialist',
    calendlyUrl: 'https://calendly.com/kyle-solutionsmadesimple/r-d-presenter-meeting-duplicate-1?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
  },
  {
    initials: 'SW',
    name: 'Sophie White',
    badge: 'R&D Specialist',
    calendlyUrl: 'https://calendly.com/sophie-solutionsmadesimple/r-d-presenter-meeting-duplicate-4?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
  },
  {
    initials: 'LJ',
    name: 'Leah Johnson',
    badge: 'R&D Specialist',
    calendlyUrl: 'https://calendly.com/leah-solutionsmadesimple/r-d-presenter-meeting-duplicate-3-duplicate-2?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
  },
]

const PROPOSAL_SPECIALIST = {
  initials: 'JM',
  name: 'Jeff Mohlman',
  firm: 'Navigators',
  calendlyUrl: 'https://calendly.com/jeff-navigators/proposal_call_jeff_mohlman?month=2026-04&embed_domain=forbesmgt.com&embed_type=Inline',
}

type Tab = 'discovery' | 'proposal'

export default function SchedulingPage() {
  const [tab, setTab] = useState<Tab>('discovery')

  return (
    <div>
      {/* Page heading — matches other admin pages */}
      <div style={{ marginBottom: 24 }}>
        <h1
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}
        >
          Specialist Booking
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
          Book discovery and proposal calls with partner specialists.
        </div>
      </div>

      {/* Dark inset card — matches the booking tool mockup */}
      <div
        style={{
          background: 'var(--charcoal)',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          className="fm-pattern absolute inset-0 pointer-events-none"
          style={{ opacity: 0.4 }}
        />

        {/* Tabs */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            borderBottom: '1px solid rgba(226,196,155,0.1)',
            background: 'var(--charcoal2)',
          }}
        >
          <TabButton active={tab === 'discovery'} onClick={() => setTab('discovery')}>
            Discovery Calls
          </TabButton>
          <div
            style={{
              width: 1,
              height: 16,
              background: 'rgba(226,196,155,0.12)',
              margin: '0 8px',
            }}
          />
          <TabButton active={tab === 'proposal'} onClick={() => setTab('proposal')}>
            Proposal Calls
          </TabButton>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 1, padding: '24px 28px 32px' }}>
          {tab === 'discovery' ? <DiscoveryPanel /> : <ProposalPanel />}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '18px 28px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: active ? 'var(--champagne)' : 'rgba(240,231,215,0.4)',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid var(--champagne)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        fontFamily: 'inherit',
      }}
      onMouseOver={(e) => {
        if (!active) e.currentTarget.style.color = 'rgba(240,231,215,0.75)'
      }}
      onMouseOut={(e) => {
        if (!active) e.currentTarget.style.color = 'rgba(240,231,215,0.4)'
      }}
    >
      {children}
    </button>
  )
}

function SectionIntro({ text, note }: { text: string; note?: string }) {
  return (
    <div className="flex items-center" style={{ gap: 16, marginBottom: 20 }}>
      <div style={{ width: 24, height: 1, background: 'var(--champagne)', opacity: 0.5 }} />
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(226,196,155,0.6)',
        }}
      >
        {text}
      </span>
      {note && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.08em',
            color: 'rgba(240,231,215,0.3)',
            marginLeft: 'auto',
          }}
        >
          {note}
        </span>
      )}
    </div>
  )
}

function DiscoveryPanel() {
  return (
    <div>
      <SectionIntro
        text="Solutions Made Simple · R&D Tax Credit"
        note="All specialists shown simultaneously — scan availability at a glance"
      />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
        {DISCOVERY_SPECIALISTS.map((s) => (
          <SpecialistCard key={s.initials} specialist={s} />
        ))}
      </div>
    </div>
  )
}

function SpecialistCard({ specialist }: { specialist: Specialist }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(226,196,155,0.12)',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(226,196,155,0.3)')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(226,196,155,0.12)')}
    >
      <div
        style={{
          background: 'var(--charcoal2)',
          padding: '14px 14px 12px',
          borderBottom: '1px solid rgba(226,196,155,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <Avatar initials={specialist.initials} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ivory)', letterSpacing: '0.04em' }}>
          {specialist.name}
        </div>
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(226,196,155,0.55)',
          }}
        >
          {specialist.badge}
        </div>
      </div>
      <div style={{ background: 'white', minHeight: 580 }}>
        <iframe
          src={specialist.calendlyUrl}
          title={`${specialist.name} availability`}
          style={{ width: '100%', height: 580, border: 'none', display: 'block' }}
        />
      </div>
    </div>
  )
}

function Avatar({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(108,22,28,0.6)',
        border: '1px solid rgba(226,196,155,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: 'var(--champagne)',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

function ProposalPanel() {
  return (
    <div>
      <SectionIntro text="Navigators · Proposal Calls Only" />
      <div
        className="grid"
        style={{ gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}
      >
        <div
          style={{
            background: 'var(--charcoal2)',
            border: '1px solid rgba(226,196,155,0.15)',
            borderTop: '3px solid var(--cherry)',
            padding: '28px 24px',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <Avatar initials={PROPOSAL_SPECIALIST.initials} size={52} />
          </div>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 400, color: 'var(--ivory)', marginBottom: 4 }}
          >
            {PROPOSAL_SPECIALIST.name}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--champagne)',
              marginBottom: 20,
            }}
          >
            {PROPOSAL_SPECIALIST.firm}
          </div>
          <div
            style={{ height: 1, background: 'rgba(226,196,155,0.1)', marginBottom: 18 }}
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 300,
              color: 'rgba(240,231,215,0.55)',
              lineHeight: 1.75,
            }}
          >
            <strong style={{ color: 'var(--champagne)', fontWeight: 600 }}>
              Proposal calls only.
            </strong>{' '}
            Only route clients here once they have completed the discovery phase and Forbes
            Management has confirmed they are ready to move forward.
          </div>
        </div>
        <div
          style={{
            border: '1px solid rgba(226,196,155,0.12)',
            borderRadius: 2,
            overflow: 'hidden',
            background: 'white',
          }}
        >
          <iframe
            src={PROPOSAL_SPECIALIST.calendlyUrl}
            title={`${PROPOSAL_SPECIALIST.name} availability`}
            style={{ width: '100%', height: 660, border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}
