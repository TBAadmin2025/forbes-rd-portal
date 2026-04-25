import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS
  const serviceClient = createServiceClient()

  // Check role
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin' || profile?.role === 'admin') {
    // Admin: return all submissions
    const { data, error } = await serviceClient
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  // Client: return own submission
  const { data, error } = await serviceClient
    .from('submissions')
    .select('*')
    .eq('client_user_id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })

  // Mark the submission as actively in progress on portal access.
  const now = new Date().toISOString()
  const updates: Record<string, string> = { last_active_at: now }
  if (data.status === 'invited') {
    updates.status = 'in_progress'
    if (!data.started_at) updates.started_at = now
  }
  const { data: touched } = await serviceClient
    .from('submissions')
    .update(updates)
    .eq('id', data.id)
    .select()
    .single()

  return Response.json(touched ?? { ...data, ...updates })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  console.log('POST /api/submissions: creating for user', user.id)

  // Use service client to bypass RLS for insert
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('submissions')
    .insert({
      client_user_id: user.id,
      contact_name: body.contact_name,
      company_name: body.company_name || null,
      contact_email: body.contact_email,
      admin_notes: body.admin_notes || null,
      status: body.status || 'internal',
      submission_method: body.submission_method || null,
      invited_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .select()
    .single()

  console.log('POST /api/submissions: result =', data?.id ?? 'null', 'error =', error?.message ?? 'none')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
