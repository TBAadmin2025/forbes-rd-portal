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
  const { contact_name, company_name, contact_email, admin_notes, send_invite = true } = body

  if (!contact_name) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }
  if (send_invite && !contact_email) {
    return Response.json({ error: 'Email is required when sending an invite' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (send_invite) {
    // Full invite flow: create auth user + send email + create submission
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      contact_email,
      {
        data: {
          full_name: contact_name,
          company_name: company_name || null,
          role: 'client',
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

    await serviceClient
      .from('profiles')
      .upsert({
        id: newUserId,
        email: contact_email,
        role: 'client',
        full_name: contact_name,
      })

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
  } else {
    // Record only: create submission without auth user (no portal access yet)
    const { data: submission, error: subError } = await serviceClient
      .from('submissions')
      .insert({
        client_user_id: null,
        contact_name,
        company_name: company_name || null,
        contact_email: contact_email || null,
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
      message: `Client record created. No portal invite sent — activate when ready.`,
    })
  }
}

// Activate portal for an existing client (send invite after the fact)
export async function PATCH(request: NextRequest) {
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
  const { submission_id } = body

  if (!submission_id) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  // Get the submission
  const { data: submission } = await serviceClient
    .from('submissions')
    .select('*')
    .eq('id', submission_id)
    .single()

  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.client_user_id) {
    return Response.json({ error: 'Portal already activated for this client' }, { status: 409 })
  }

  if (!submission.contact_email) {
    return Response.json({ error: 'Client has no email address' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Create auth user + send invite
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    submission.contact_email,
    {
      data: {
        full_name: submission.contact_name || '',
        company_name: submission.company_name || null,
        role: 'client',
      },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  )

  if (inviteError) {
    return Response.json({ error: inviteError.message }, { status: 500 })
  }

  const newUserId = inviteData.user.id

  await serviceClient
    .from('profiles')
    .upsert({
      id: newUserId,
      email: submission.contact_email,
      role: 'client',
      full_name: submission.contact_name || '',
    })

  // Link the user to the submission
  await serviceClient
    .from('submissions')
    .update({ client_user_id: newUserId })
    .eq('id', submission_id)

  return Response.json({
    message: `Portal activated. Invitation sent to ${submission.contact_email}.`,
  })
}
