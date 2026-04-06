import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  // Verify the caller is an admin
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

  const body = await request.json()
  const { contact_name, company_name, contact_email, admin_notes } = body

  if (!contact_name || !contact_email) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Step 1: Invite user via Supabase — this sends the email through
  // the SMTP provider configured in the Supabase dashboard (Resend)
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    contact_email,
    {
      data: {
        full_name: contact_name,
        company_name: company_name || null,
      },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  )

  if (inviteError) {
    if (inviteError.message.includes('already been registered') || inviteError.message.includes('already exists')) {
      return Response.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }
    return Response.json({ error: inviteError.message }, { status: 500 })
  }

  const newUserId = inviteData.user.id

  // Step 2: Ensure profile exists with client role
  await serviceClient
    .from('profiles')
    .upsert({
      id: newUserId,
      role: 'client',
      full_name: contact_name,
    })

  // Step 3: Create the submission record
  const { data: submission, error: subError } = await serviceClient
    .from('submissions')
    .insert({
      client_user_id: newUserId,
      contact_name,
      company_name: company_name || null,
      contact_email,
      admin_notes: admin_notes || null,
      status: 'invited',
      invited_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (subError) {
    return Response.json({ error: subError.message }, { status: 500 })
  }

  return Response.json({
    submission,
    message: `Invitation sent to ${contact_email}. They'll be prompted to set a password.`,
  })
}
