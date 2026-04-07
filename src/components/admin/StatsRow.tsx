interface StatsRowProps {
  stats: {
    total: number
    internal: number
    withClient: number
    submitted: number
    sent: number
  }
}

export default function StatsRow({ stats }: StatsRowProps) {
  const cards = [
    { label: 'Internal Drafts', value: stats.internal, border: 'var(--muted)', sub: 'Forbes prepping' },
    { label: 'With Client', value: stats.withClient, border: 'var(--champagne)', sub: 'Invited or working' },
    { label: 'Ready to Review', value: stats.submitted, border: 'var(--cherry)', sub: 'Needs attention' },
    { label: 'Sent to Partner', value: stats.sent, border: 'var(--charcoal)', sub: `${stats.total} total` },
  ]

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '18px 20px',
            borderTop: `3px solid ${card.border}`,
          }}
        >
          <div
            className="font-serif"
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: 'var(--charcoal)',
              lineHeight: 1,
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginTop: 5,
              fontWeight: 600,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              marginTop: 3,
              fontWeight: 300,
            }}
          >
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
