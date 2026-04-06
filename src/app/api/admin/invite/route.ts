import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendInviteEmail } from '@/lib/email'

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

  // Step 1: Create the user in Supabase Auth with a random temp password.
  // They'll set their real password via the invite link.
  const tempPassword = crypto.randomUUID() + '-Aa1!'
  const { data: createData, error: createError } = await serviceClient.auth.admin.createUser({
    email: contact_email,
    password: tempPassword,
    email_confirm: true, // Mark email as confirmed since we're sending our own invite
    user_metadata: {
      full_name: contact_name,
      company_name: company_name || null,
    },
  })

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return Response.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }
    return Response.json({ error: createError.message }, { status: 500 })
  }

  const newUserId = createData.user.id

  // Step 2: Generate an invite link so the user can set their password
  const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: 'invite',
    email: contact_email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (linkError) {
    console.error('Failed to generate invite link:', linkError)
    return Response.json({ error: 'Failed to generate invite link' }, { status: 500 })
  }

  // Build the invite URL. Supabase returns a verification URL with token params —
  // we need to construct it pointing to our callback.
  const inviteLink = linkData.properties?.action_link
    || `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(linkData.properties?.hashed_token || '')}&type=invite`

  // Step 3: Ensure profile exists with client role
  await serviceClient
    .from('profiles')
    .upsert({
      id: newUserId,
      role: 'client',
      full_name: contact_name,
    })

  // Step 4: Create the submission record
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

  // Step 5: Send branded invite email via Resend
  const emailResult = await sendInviteEmail({
    to: contact_email,
    clientName: contact_name,
    companyName: company_name || undefined,
    inviteLink,
  })

  return Response.json({
    submission,
    email: emailResult,
    message: emailResult.sent
      ? `Invitation sent to ${contact_email}. They'll be prompted to set a password.`
      : `Client created. Email not sent (${emailResult.reason}). Invite link logged to console.`,
  })
}
