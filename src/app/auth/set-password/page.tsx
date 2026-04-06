'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/shared/Button'

const LIGHT_LOGO = 'https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40be2ff46701564ce7664.svg'

function SetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // This page is for invited users who received a link with a token.
    // Supabase invite links include a token_hash and type=invite.
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (tokenHash && type) {
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'invite' | 'magiclink' | 'email',
      }).then(({ error: verifyError }) => {
        if (verifyError) {
          setError('This invitation link has expired or is invalid. Please contact your administrator.')
        }
        setVerifying(false)
      })
    } else {
      // Check if already authenticated (e.g. coming from invite email redirect)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setVerifying(false)
        } else {
          setError('No valid invitation found. Please contact your administrator.')
          setVerifying(false)
        }
      })
    }
  }, [searchParams, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      // Redirect based on role after a brief pause
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setTimeout(() => {
          if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            router.push('/admin/dashboard')
          } else {
            router.push('/portal/welcome')
          }
        }, 1500)
      }
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--ivory)' }}
    >
      <div className="w-full" style={{ maxWidth: 400, padding: '0 20px' }}>
        <div className="flex flex-col items-center" style={{ marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LIGHT_LOGO}
            alt="Forbes Management"
            style={{ height: 52, width: 'auto', marginBottom: 24 }}
          />
          <h1
            className="font-serif"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--charcoal)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Welcome to Forbes Management
          </h1>
          <p
            style={{
              fontSize: 14,
              fontWeight: 300,
              color: 'var(--muted)',
              marginTop: 10,
              textAlign: 'center',
              lineHeight: 1.7,
            }}
          >
            Set a password to get started with your R&D Tax Credit portal.
          </p>
        </div>

        {success ? (
          <div
            style={{
              background: 'var(--em-light)',
              borderLeft: '3px solid var(--emerald)',
              padding: '13px 17px',
              fontSize: 12,
              lineHeight: 1.7,
              borderRadius: '0 3px 3px 0',
              color: 'var(--emerald)',
              fontWeight: 400,
            }}
          >
            <strong style={{ fontWeight: 600 }}>You&apos;re all set!</strong>{' '}
            Taking you to your portal...
          </div>
        ) : verifying ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              fontWeight: 300,
              textAlign: 'center',
            }}
          >
            Verifying your invitation...
          </div>
        ) : error && !password ? (
          <div
            style={{
              background: 'rgba(185,28,28,0.06)',
              borderLeft: '3px solid #b91c1c',
              padding: '13px 17px',
              fontSize: 12,
              lineHeight: 1.7,
              borderRadius: '0 3px 3px 0',
              color: '#b91c1c',
              fontWeight: 300,
            }}
          >
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="password"
                className="block"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}
              >
                Create Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="finput"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="confirm"
                className="block"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className="finput"
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(185,28,28,0.06)',
                  borderLeft: '3px solid #b91c1c',
                  padding: '13px 17px',
                  fontSize: 12,
                  lineHeight: 1.7,
                  borderRadius: '0 3px 3px 0',
                  marginBottom: 20,
                  color: '#b91c1c',
                  fontWeight: 300,
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="cherry"
              size="lg"
              disabled={loading}
              style={{
                width: '100%',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Setting up...' : 'Create Account & Continue'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: 'var(--ivory)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
            Loading...
          </div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  )
}
