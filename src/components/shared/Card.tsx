interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: 28,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  )
}
