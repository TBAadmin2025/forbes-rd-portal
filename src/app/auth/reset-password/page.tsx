'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/components/shared/Button'

const LIGHT_LOGO = 'https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40be2ff46701564ce7664.svg'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase automatically picks up the recovery token from the URL hash
    // and establishes a session. We listen for that event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session (page refresh case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

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
      setTimeout(() => router.push('/login'), 2000)
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
            Reset your password
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
            Choose a new password for your account.
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
            <strong style={{ fontWeight: 600 }}>Password updated.</strong>{' '}
            Redirecting you to sign in...
          </div>
        ) : !sessionReady ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              fontWeight: 300,
              textAlign: 'center',
            }}
          >
            Verifying your reset link...
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
                New Password
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
              {loading ? 'Updating...' : 'Set New Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
