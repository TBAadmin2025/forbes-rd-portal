import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST sets or clears a manual state mark on a (submission, year, requirement)
// triple. State must be 'have' | 'n_a' | null. Null deletes any existing mark
// (state reverts to 'unknown' or 'uploaded' depending on derived data).

const VALID_REQS = new Set(['payroll', 'pandl', 'qre'])

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const { submission_id, tax_year, requirement_key, state, notes } = body as {
    submission_id?: string
    tax_year?: number
    requirement_key?: string
    state?: 'have' | 'n_a' | null
    notes?: string | null
  }

  if (!submission_id || typeof tax_year !== 'number' || !requirement_key) {
    return Response.json(
      { error: 'submission_id, tax_year, and requirement_key required' },
      { status: 400 },
    )
  }
  if (!VALID_REQS.has(requirement_key)) {
    return Response.json({ error: 'Unknown requirement_key' }, { status: 400 })
  }

  if (state === null || state === undefined) {
    const { error } = await serviceClient
      .from('requirement_marks')
      .delete()
      .eq('submission_id', submission_id)
      .eq('tax_year', tax_year)
      .eq('requirement_key', requirement_key)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, state: null })
  }

  if (state !== 'have' && state !== 'n_a') {
    return Response.json({ error: 'state must be have, n_a, or null' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('requirement_marks')
    .upsert(
      {
        submission_id,
        tax_year,
        requirement_key,
        state,
        notes: notes ?? null,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id,tax_year,requirement_key' },
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, state })
}
