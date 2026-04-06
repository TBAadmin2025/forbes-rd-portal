import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'cherry' | 'champagne' | 'dark' | 'ghost' | 'emerald' | 'ghost-light'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  cherry: {
    background: 'var(--cherry)',
    color: 'var(--ivory)',
  },
  champagne: {
    background: 'var(--champagne)',
    color: 'var(--charcoal)',
  },
  dark: {
    background: 'var(--charcoal)',
    color: 'var(--ivory)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--charcoal)',
    border: '1.5px solid var(--border)',
  },
  emerald: {
    background: 'var(--emerald)',
    color: 'var(--white)',
  },
  'ghost-light': {
    background: 'transparent',
    color: 'var(--ivory)',
    border: '1.5px solid rgba(240,231,215,0.3)',
  },
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '7px 16px', fontSize: 10 },
  md: { padding: '11px 24px', fontSize: 11 },
  lg: { padding: '14px 32px', fontSize: 12 },
}

export default function Button({
  variant = 'cherry',
  size = 'md',
  className = '',
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center cursor-pointer whitespace-nowrap ${className}`}
      style={{
        gap: 8,
        border: 'none',
        borderRadius: 3,
        fontFamily: 'var(--font-montserrat), sans-serif',
        fontWeight: 600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        transition: 'all 0.2s',
        textDecoration: 'none',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
