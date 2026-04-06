import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can add team members' }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, email, role } = body

  if (!full_name || !email) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 })
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return Response.json({ error: 'Role must be admin or super_admin' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Create team member via invite — Supabase sends the email through SMTP (Resend)
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name, role },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  )

  if (inviteError) {
    if (inviteError.message.includes('already been registered') || inviteError.message.includes('already exists')) {
      return Response.json({ error: 'A user with this email already exists.' }, { status: 409 })
    }
    return Response.json({ error: inviteError.message }, { status: 500 })
  }

  const newUserId = inviteData.user.id

  // Set their profile with the admin role
  await serviceClient
    .from('profiles')
    .upsert({
      id: newUserId,
      email,
      role,
      full_name,
    })

  return Response.json({
    message: `Invitation sent to ${email}. They'll be prompted to set a password.`,
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all team members (admins and super_admins)
  const { data: team, error } = await serviceClient
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(team)
}

// PATCH — resend invite to a team member
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can resend invites' }, { status: 403 })
  }

  const body = await request.json()
  const { email } = body
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Resend invite by generating a new invite link
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${siteUrl}/auth/callback` }
  )

  if (inviteError) {
    // If user already confirmed, send a password reset instead
    if (inviteError.message.includes('already confirmed')) {
      const { error: resetError } = await serviceClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${siteUrl}/auth/reset-password` },
      })
      if (resetError) return Response.json({ error: resetError.message }, { status: 500 })
      return Response.json({ message: 'Password reset link sent.' })
    }
    return Response.json({ error: inviteError.message }, { status: 500 })
  }

  return Response.json({ message: `Invite resent to ${email}.` })
}
