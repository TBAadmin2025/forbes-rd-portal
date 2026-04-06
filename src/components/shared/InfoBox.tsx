interface InfoBoxProps {
  children: React.ReactNode
}

export default function InfoBox({ children }: InfoBoxProps) {
  return (
    <div
      style={{
        background: '#fdf8f0',
        borderLeft: '3px solid var(--champagne)',
        padding: '13px 17px',
        fontSize: 12,
        lineHeight: 1.7,
        borderRadius: '0 3px 3px 0',
        marginBottom: 20,
        color: 'var(--charcoal)',
        fontWeight: 300,
      }}
    >
      {children}
    </div>
  )
}
