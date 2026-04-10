'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

type ToastVariant = 'success' | 'error' | 'info' | 'confirm'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
  exiting?: boolean
}

interface ConfirmState {
  message: string
  resolve: (confirmed: boolean) => void
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
  confirm: (message: string) => Promise<boolean>
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const nextId = useRef(0)

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 300)
    }, 4000)
  }, [])

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve })
    })
  }, [])

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result)
    setConfirmState(null)
  }

  // ESC to dismiss confirm
  useEffect(() => {
    if (!confirmState) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleConfirm(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState])

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,17,17,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => handleConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--ivory)',
              borderRadius: 6,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div
              style={{
                background: 'var(--cherry)',
                padding: '18px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }} />
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--ivory)', position: 'relative', zIndex: 1 }}
              >
                Confirm
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.7, fontWeight: 400 }}>
                {confirmState.message}
              </div>
            </div>
            <div
              style={{
                padding: '12px 24px 18px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 3,
                  border: '1.5px solid var(--border)',
                  background: 'var(--white)',
                  color: 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                autoFocus
                style={{
                  padding: '9px 20px',
                  borderRadius: 3,
                  border: 'none',
                  background: 'var(--cherry)',
                  color: 'var(--ivory)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'rgba(0,79,53,0.08)', border: 'var(--emerald)', color: 'var(--emerald)', icon: '✓' },
  error: { bg: 'rgba(108,22,28,0.06)', border: 'var(--cherry)', color: 'var(--cherry)', icon: '!' },
  info: { bg: 'var(--white)', border: 'var(--champagne)', color: 'var(--charcoal)', icon: 'i' },
  confirm: { bg: 'var(--white)', border: 'var(--champagne)', color: 'var(--charcoal)', icon: '?' },
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const v = VARIANT_STYLES[t.variant]
  return (
    <div
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderLeft: `4px solid ${v.border}`,
        borderRadius: 4,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 300,
        maxWidth: 440,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        pointerEvents: 'auto',
        animation: t.exiting ? 'fadeOut 0.3s ease forwards' : 'slideInRight 0.3s ease',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: v.border,
          color: v.bg === 'var(--white)' ? 'var(--ivory)' : 'var(--white)',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {v.icon}
      </span>
      <span style={{ fontSize: 13, color: v.color, fontWeight: 500, lineHeight: 1.5 }}>
        {t.message}
      </span>
    </div>
  )
}
