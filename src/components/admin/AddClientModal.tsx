'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ConfirmationState {
  submissionId: string
  clientName: string
  clientEmail: string
  portalSent: boolean
}

export default function AddClientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)

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
          send_invite: sendInvite,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create client')
        setSending(false)
        return
      }

      const data = await res.json()
      setSending(false)
      onSuccess()

      setConfirmation({
        submissionId: data.submission?.id,
        clientName: fullName,
        clientEmail: email,
        portalSent: sendInvite,
      })
    } catch {
      setError('Something went wrong')
      setSending(false)
    }
  }

  const handleClose = () => {
    setFullName('')
    setBusinessName('')
    setEmail('')
    setNote('')
    setSendInvite(true)
    setConfirmation(null)
    setError('')
    onClose()
  }

  const handleGoToClient = () => {
    if (confirmation?.submissionId) {
      router.push(`/admin/submission/${confirmation.submissionId}`)
    }
    handleClose()
  }

  const handleStartWorkspace = () => {
    if (confirmation?.submissionId) {
      router.push(`/admin/submission/${confirmation.submissionId}/workspace`)
    }
    handleClose()
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
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
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
        {/* Header */}
        <div
          className="relative overflow-hidden"
          style={{
            background: confirmation ? 'var(--emerald)' : 'var(--cherry)',
            padding: '22px 28px',
            borderRadius: '6px 6px 0 0',
            transition: 'background 0.3s',
          }}
        >
          <div
            className="fm-pattern absolute inset-0 pointer-events-none"
            style={{ opacity: 0.25 }}
          />
          <button
            onClick={handleClose}
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
              {confirmation ? 'Client Added' : 'Add New Client'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(240,231,215,0.55)',
                marginTop: 3,
                fontWeight: 300,
              }}
            >
              {confirmation
                ? confirmation.portalSent
                  ? 'Portal invite sent successfully.'
                  : 'Client record created.'
                : 'Create a client record. Optionally send a portal invite.'}
            </div>
          </div>
        </div>

        {/* Confirmation View */}
        {confirmation ? (
          <div style={{ padding: '28px 28px 22px' }}>
            <div
              style={{
                background: 'var(--em-light)',
                borderRadius: 4,
                padding: '20px 24px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>
                {confirmation.portalSent ? '📧' : '✅'}
              </div>
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}
              >
                {confirmation.clientName}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.7 }}>
                {confirmation.portalSent
                  ? <>A portal invite has been sent to <strong style={{ color: 'var(--charcoal)', fontWeight: 500 }}>{confirmation.clientEmail}</strong>. They&apos;ll receive an email to set their password and access the portal.</>
                  : <>Client record created. You can begin entering their information now or activate their portal access later.</>
                }
              </div>
            </div>

            <div className="flex" style={{ gap: 10 }}>
              {confirmation.portalSent ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleClose} style={{ flex: 1 }}>
                    Done
                  </Button>
                  <Button variant="cherry" onClick={handleGoToClient} style={{ flex: 1 }}>
                    View Client
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={handleGoToClient} style={{ flex: 1 }}>
                    View Profile
                  </Button>
                  <Button variant="cherry" onClick={handleStartWorkspace} style={{ flex: 1 }}>
                    Begin Work
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Form Body */}
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

              <FormField label="Email Address">
                <input
                  className="finput"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Note (Internal)">
                <textarea
                  className="finput"
                  placeholder="Optional — only visible to your team"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </FormField>

              {/* Portal invite toggle */}
              <div
                style={{
                  background: sendInvite ? 'rgba(0,79,53,0.05)' : 'var(--warm)',
                  border: sendInvite ? '1.5px solid rgba(0,79,53,0.2)' : '1.5px solid var(--border)',
                  borderRadius: 4,
                  padding: '14px 16px',
                  marginTop: 4,
                  transition: 'all 0.15s',
                }}
              >
                <label className="flex items-start" style={{ gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--emerald)', marginTop: 1, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                      Send portal invite now
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300, marginTop: 2, lineHeight: 1.5 }}>
                      {sendInvite
                        ? 'Client will receive an email to set their password and access the portal.'
                        : 'Client record will be created without portal access. You can activate it later.'}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end"
              style={{ padding: '0 28px 22px', gap: 10 }}
            >
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant={sendInvite ? 'cherry' : 'dark'}
                onClick={handleSubmit}
                disabled={sending || !fullName || !email}
              >
                {sending
                  ? 'Creating...'
                  : sendInvite
                    ? 'Create & Send Invite'
                    : 'Create Client Record'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
