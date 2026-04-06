'use client'

import { useState } from 'react'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddClientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!fullName || !email) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: fullName,
          company_name: businessName,
          contact_email: email,
          admin_notes: note || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create client')
        setSending(false)
        return
      }

      setSending(false)
      setFullName('')
      setBusinessName('')
      setEmail('')
      setNote('')
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
        {/* Cherry header */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'var(--cherry)',
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
              Add New Client
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(240,231,215,0.55)',
                marginTop: 3,
                fontWeight: 300,
              }}
            >
              They&apos;ll receive an email to set their password and access the portal.
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

          <FormField label="Client's Full Name">
            <input
              className="finput"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </FormField>

          <FormField label="Business Name">
            <input
              className="finput"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </FormField>

          <FormField label="Email Address" hint="We'll send an invitation to this address">
            <input
              className="finput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label="Note to Client">
            <textarea
              className="finput"
              placeholder="Optional"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ resize: 'vertical' }}
            />
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
            variant="cherry"
            onClick={handleSubmit}
            disabled={sending || !fullName || !email}
          >
            {sending ? 'Sending...' : 'Send Invitation →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
