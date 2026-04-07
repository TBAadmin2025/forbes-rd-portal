import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH — update master employee + sync per-year employee rows
// Body: { full_name?, employee_type?, state?, years_worked? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const sc = createServiceClient()

  // Get current master record
  const { data: current } = await sc.from('client_employees').select('*').eq('id', id).single()
  if (!current) return Response.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('full_name' in body) updates.full_name = body.full_name
  if ('employee_type' in body) updates.employee_type = body.employee_type
  if ('state' in body) updates.state = body.state
  if ('years_worked' in body) updates.years_worked = body.years_worked

  const { data: updated, error } = await sc
    .from('client_employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sync per-year employee rows
  // 1. Update name/type/state on existing per-year rows
  if ('full_name' in body || 'employee_type' in body || 'state' in body) {
    const rowUpdates: Record<string, unknown> = {}
    if ('full_name' in body) rowUpdates.full_name = body.full_name
    if ('employee_type' in body) rowUpdates.employee_type = body.employee_type
    if ('state' in body) rowUpdates.state = body.state

    if (Object.keys(rowUpdates).length > 0) {
      await sc.from('employees').update(rowUpdates).eq('client_employee_id', id)
    }
  }

  // 2. If years_worked changed, add/remove per-year rows
  if ('years_worked' in body) {
    const oldYears: number[] = current.years_worked || []
    const newYears: number[] = body.years_worked || []
    const toAdd = newYears.filter((y) => !oldYears.includes(y))
    const toRemove = oldYears.filter((y) => !newYears.includes(y))

    // Remove rows for years no longer worked
    if (toRemove.length > 0) {
      await sc
        .from('employees')
        .delete()
        .eq('client_employee_id', id)
        .in('tax_year', toRemove)
    }

    // Add rows for new years
    if (toAdd.length > 0) {
      const newRows = toAdd.map((year) => ({
        submission_id: current.submission_id,
        client_employee_id: id,
        tax_year: year,
        full_name: updated.full_name,
        employee_type: updated.employee_type,
        state: updated.state || 'Georgia',
        total_wages: 0,
        total_hours_worked: null,
        rd_percentage: null,
        project_name: null,
      }))
      await sc.from('employees').insert(newRows)
    }
  }

  return Response.json(updated)
}

// DELETE — cascades to per-year rows via FK
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()
  const { error } = await sc.from('client_employees').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
