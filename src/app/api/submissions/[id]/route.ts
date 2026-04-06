import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sc = createServiceClient()

  const { data: submission, error } = await sc
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 404 })
  }

  // Also fetch documents and qre_summary
  const { data: documents } = await sc
    .from('documents')
    .select('*')
    .eq('submission_id', id)

  const { data: qreSummary } = await sc
    .from('qre_summary')
    .select('*')
    .eq('submission_id', id)

  return Response.json({
    ...submission,
    documents: documents || [],
    qre_summary: qreSummary || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Check role for field restrictions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'

  const sc = createServiceClient()

  // Client can only update company fields and limited status transitions
  if (!isAdmin) {
    const allowedFields = [
      'company_name',
      'dba_name',
      'contact_name',
      'contact_email',
      'contact_phone',
      'fein',
      'state_tax_id',
      'business_state',
      'status',
      'started_at',
      'submitted_at',
      'submission_method',
      'last_active_at',
      'current_step',
    ]
    const filtered: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in body) filtered[key] = body[key]
    }

    const { data, error } = await sc
      .from('submissions')
      .update(filtered)
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  // Admin can update all fields
  const { id: _id, ...updateData } = body

  const { data, error } = await sc
    .from('submissions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
