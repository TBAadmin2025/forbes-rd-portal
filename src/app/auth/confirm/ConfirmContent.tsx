'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'

const DARK_LOGO = 'https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40c28d0b6d3d9f1a59b5a.svg'

export default function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasParams = !!tokenHash && !!type

  const handleClick = async () => {
    if (!tokenHash || !type) return
    setLoading(true)
    setError(null)

    try {
      console.log('token_hash received:', tokenHash)
      console.log('type received:', type)

      // Step 1: Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'invite' | 'magiclink' | 'email',
      })

      console.log('verifyOtp result:', JSON.stringify(verifyError))

      if (verifyError) {
        setError('This link has expired or is invalid. Please request a new one.')
        setLoading(false)
        return
      }

      // Step 2: Get session to confirm auth worked
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('session result:', session ? 'session exists' : 'no session', JSON.stringify(sessionError))

      if (!session) {
        setError('Authentication failed. Please try again.')
        setLoading(false)
        return
      }

      // Step 3: Check profile role — may not exist yet for new users
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      console.log('profile query result:', JSON.stringify(profile), JSON.stringify(profileError))

      // Route based on role — default to portal if no profile yet
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        router.push('/admin/pipeline')
      } else {
        router.push('/portal/welcome')
      }
    } catch (err) {
      console.error('Auth confirm error:', err)
      setError('Something went wrong. Please try again or request a new link.')
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--ivory)' }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 20 }}>
        <img
          src={DARK_LOGO}
          alt="Forbes Management"
          style={{ height: 32, marginBottom: 40 }}
        />

        <div
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            fontWeight: 300,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          You&apos;re being securely signed in to Forbes Management.
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(108,22,28,0.06)',
              border: '1px solid rgba(108,22,28,0.15)',
              borderRadius: 3,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--cherry)',
              fontWeight: 400,
            }}
          >
            {error}
          </div>
        )}

        {hasParams ? (
          <Button
            variant="cherry"
            size="lg"
            onClick={handleClick}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Signing in...' : 'Click here to access your portal →'}
          </Button>
        ) : (
          <div
            style={{
              background: 'rgba(108,22,28,0.06)',
              border: '1px solid rgba(108,22,28,0.15)',
              borderRadius: 3,
              padding: '12px 16px',
              fontSize: 12,
              color: 'var(--cherry)',
            }}
          >
            This link is invalid or has expired. Please check your email for a valid sign-in link.
          </div>
        )}
      </div>
    </div>
  )
}
