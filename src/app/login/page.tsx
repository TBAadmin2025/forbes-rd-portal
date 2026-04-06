'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Button from '@/components/shared/Button'
import InfoBox from '@/components/shared/InfoBox'

const LIGHT_LOGO = 'https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40be2ff46701564ce7664.svg'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else {
        setError(authError.message)
      }
    } else {
      router.push('/')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email address above, then click "Forgot password."')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
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
            Sign in to your portal
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
            Enter your email and password to access your account.
          </p>
        </div>

        {resetSent ? (
          <InfoBox>
            <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>
              Check your email
            </strong>{' '}
            — we sent you a password reset link.
          </InfoBox>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
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
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="finput"
              />
            </div>

            <div style={{ marginBottom: 8 }}>
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
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="finput"
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cherry)',
                  fontSize: 12,
                  fontWeight: 400,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
