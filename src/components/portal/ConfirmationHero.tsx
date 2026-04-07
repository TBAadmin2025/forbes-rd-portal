interface ConfirmationHeroProps {
  firstName: string
}

export default function ConfirmationHero({ firstName }: ConfirmationHeroProps) {
  return (
    <div
      style={{
        background: 'var(--charcoal)',
        borderRadius: 4,
        padding: 40,
        textAlign: 'center',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* FM pattern */}
      <div
        className="fm-pattern absolute inset-0 pointer-events-none"
        style={{ opacity: 0.12 }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
        <div
          className="font-serif"
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: 'var(--champagne)',
            marginBottom: 8,
          }}
        >
          You&apos;re all set, {firstName}.
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(240,231,215,0.65)',
            fontWeight: 300,
            lineHeight: 1.8,
          }}
        >
          Your data has been submitted to Forbes Management. We&apos;ll review
          everything and prepare your R&D tax credit study within 2–3 business
          days.
        </div>
      </div>
    </div>
  )
}
