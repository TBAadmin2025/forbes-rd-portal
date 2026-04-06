type TagVariant = 'invited' | 'progress' | 'submitted' | 'complete'

interface TagProps {
  variant: TagVariant
  children: React.ReactNode
}

const variantStyles: Record<TagVariant, React.CSSProperties> = {
  invited: {
    background: 'rgba(226,196,155,0.2)',
    color: 'var(--champ-dk)',
  },
  progress: {
    background: 'rgba(0,79,53,0.1)',
    color: 'var(--emerald)',
  },
  submitted: {
    background: 'rgba(108,22,28,0.1)',
    color: 'var(--cherry)',
  },
  complete: {
    background: 'var(--charcoal)',
    color: 'var(--champagne)',
  },
}

export default function Tag({ variant, children }: TagProps) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: 5,
        padding: '4px 12px',
        borderRadius: 100,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  )
}
