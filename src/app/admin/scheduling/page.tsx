'use client'

export default function SchedulingPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1
          className="font-serif"
          style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}
        >
          Schedule Partner Calls
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
          Book handoff calls with your R&D and payroll tax credit partners.
        </div>
      </div>

      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '60px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--champagne)' }} />

        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>

        <div
          className="font-serif"
          style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}
        >
          Coming Soon
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            fontWeight: 300,
            lineHeight: 1.8,
            maxWidth: 440,
            margin: '0 auto 28px',
          }}
        >
          We&apos;re building a scheduling hub so you can see all your partner
          team members&apos; availability in one place — no more juggling
          multiple calendar links.
        </div>

        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 12,
            padding: '24px 32px',
            background: 'var(--warm)',
            borderRadius: 4,
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
            What&apos;s coming
          </div>
          {[
            'View all partner specialists in one place',
            'See real-time availability across team members',
            'Book handoff calls directly from the portal',
            'Share booking links with your clients',
          ].map((item) => (
            <div key={item} className="flex items-center" style={{ gap: 10 }}>
              <span style={{ color: 'var(--champagne)', fontSize: 14 }}>◆</span>
              <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400 }}>{item}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 12,
            color: 'var(--muted)',
            fontWeight: 300,
          }}
        >
          In the meantime, reach out to{' '}
          <a
            href="mailto:concierge@quietwealthpartners.com"
            style={{ color: 'var(--cherry)', fontWeight: 500, textDecoration: 'none' }}
          >
            concierge@quietwealthpartners.com
          </a>{' '}
          for scheduling help.
        </div>
      </div>
    </div>
  )
}
