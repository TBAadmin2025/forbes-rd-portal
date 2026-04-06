import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email } = body

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const serviceClient = createServiceClient()

  // Generate a password reset link via admin API
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/reset-password`,
    },
  })

  if (linkError) {
    // Don't reveal whether the email exists — always return success
    console.error('Reset link generation failed:', linkError.message)
    return Response.json({ success: true })
  }

  const resetLink = linkData.properties?.action_link
    || `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(linkData.properties?.hashed_token || '')}&type=recovery`

  // Send branded reset email via Resend
  await sendResetEmail({ to: email, resetLink })

  return Response.json({ success: true })
}
