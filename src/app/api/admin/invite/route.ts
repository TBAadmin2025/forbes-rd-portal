import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST: create a new client record (always internal — no auth user, no email).
// Use PATCH to send the portal invite later.
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

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { contact_name, company_name, contact_email, admin_notes, tax_years } = body

  if (!contact_name) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!Array.isArray(tax_years) || tax_years.length === 0) {
    return Response.json({ error: 'At least one tax year is required' }, { status: 400 })
  }

  const cleanedYears = Array.from(new Set(tax_years.map(Number).filter((n) => Number.isInteger(n))))
  if (cleanedYears.length === 0) {
    return Response.json({ error: 'Tax years must be integers' }, { status: 400 })
  }

  const { data: submission, error: subError } = await serviceClient
    .from('submissions')
    .insert({
      client_user_id: null,
      contact_name,
      company_name: company_name || null,
      contact_email: contact_email || null,
      admin_notes: admin_notes || null,
      tax_years: cleanedYears,
      status: 'internal',
      last_active_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (subError) {
    return Response.json({ error: subError.message }, { status: 500 })
  }

  return Response.json({
    submission,
    message: 'Client record created. Send a portal invite when ready.',
  })
}

// PATCH: activate the portal for an existing client (sends the invite email).
// Flips status from 'internal' to 'invited' and creates the auth user.
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
    return Response.json({ error: 'Add an email address before sending the invite.' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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
      email: submission.contact_email,
      role: 'client',
      full_name: submission.contact_name || '',
    })

  await serviceClient
    .from('submissions')
    .update({
      client_user_id: newUserId,
      status: 'invited',
      invited_at: new Date().toISOString(),
    })
    .eq('id', submission_id)

  return Response.json({
    message: `Portal invite sent to ${submission.contact_email}.`,
  })
}

// PUT: resend portal invite for an existing client (auth user already exists)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

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

  const { data: submission } = await serviceClient
    .from('submissions')
    .select('*')
    .eq('id', submission_id)
    .single()

  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (!submission.client_user_id) {
    return Response.json({ error: 'No portal user to resend to. Use PATCH to send the first invite.' }, { status: 400 })
  }

  if (!submission.contact_email) {
    return Response.json({ error: 'Client has no email address.' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Re-invite the existing auth user
  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
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

  await serviceClient
    .from('submissions')
    .update({ invited_at: new Date().toISOString() })
    .eq('id', submission_id)

  return Response.json({
    message: `Invite resent to ${submission.contact_email}.`,
  })
}
