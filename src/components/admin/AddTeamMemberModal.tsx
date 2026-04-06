'use client'

import { useState } from 'react'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'

interface AddTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddTeamMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: AddTeamMemberModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!fullName || !email) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add team member')
        setSending(false)
        return
      }

      setSending(false)
      setFullName('')
      setEmail('')
      setRole('admin')
      onSuccess()
      onClose()
    } catch {
      setError('Something went wrong')
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'rgba(17,17,17,0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 500,
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--ivory)',
          borderRadius: 6,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Charcoal header */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'var(--charcoal)',
            padding: '22px 28px',
            borderRadius: '6px 6px 0 0',
          }}
        >
          <div
            className="fm-pattern absolute inset-0 pointer-events-none"
            style={{ opacity: 0.25 }}
          />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(240,231,215,0.15)',
              border: 'none',
              width: 26,
              height: 26,
              borderRadius: '50%',
              color: 'var(--ivory)',
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            ×
          </button>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              className="font-serif"
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--ivory)' }}
            >
              Add Team Member
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(240,231,215,0.55)',
                marginTop: 3,
                fontWeight: 300,
              }}
            >
              They&apos;ll receive an email to set their password and access the admin dashboard.
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(108,22,28,0.05)',
                color: 'var(--cherry)',
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: 3,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <FormField label="Full Name">
            <input
              className="finput"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>

          <FormField label="Email Address">
            <input
              className="finput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label="Role">
            <div className="flex" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={() => setRole('admin')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 3,
                  border: role === 'admin'
                    ? '2px solid var(--cherry)'
                    : '1.5px solid var(--border)',
                  background: role === 'admin' ? 'rgba(108,22,28,0.05)' : 'var(--white)',
                  color: role === 'admin' ? 'var(--cherry)' : 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('super_admin')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 3,
                  border: role === 'super_admin'
                    ? '2px solid var(--charcoal)'
                    : '1.5px solid var(--border)',
                  background: role === 'super_admin' ? 'rgba(17,17,17,0.05)' : 'var(--white)',
                  color: role === 'super_admin' ? 'var(--charcoal)' : 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Super Admin
              </button>
            </div>
          </FormField>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end"
          style={{ padding: '0 28px 22px', gap: 10 }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={handleSubmit}
            disabled={sending || !fullName || !email}
          >
            {sending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </div>
  )
}
