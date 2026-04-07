import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sc = createServiceClient()

  const { data, error } = await sc
    .from('employees')
    .select('*, employee_year_activities(activity_id)')
    .eq('id', id)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 404 })
  }

  const junctionRows = (data.employee_year_activities || []) as { activity_id: string }[]
  const activity_ids = junctionRows.map((j) => j.activity_id)
  const { employee_year_activities: _, ...rest } = data
  return Response.json({ ...rest, activity_ids })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Never write rd_hours or qualified_amount — they are generated columns
  const {
    rd_hours: _rh,
    qualified_amount: _qa,
    id: _id,
    activity_ids,
    ...updateData
  } = body

  const sc = createServiceClient()

  // Update employee row (only if there are non-junction fields)
  let data
  if (Object.keys(updateData).length > 0) {
    const result = await sc
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 })
    }
    data = result.data
  } else {
    const result = await sc.from('employees').select('*').eq('id', id).single()
    data = result.data
  }

  // If activity_ids was provided, replace the junction rows
  if (Array.isArray(activity_ids)) {
    await sc.from('employee_year_activities').delete().eq('employee_id', id)
    if (activity_ids.length > 0) {
      const junctionRows = activity_ids.map((activity_id: string) => ({
        employee_id: id,
        activity_id,
      }))
      await sc.from('employee_year_activities').insert(junctionRows)
    }
  }

  return Response.json({ ...data, activity_ids: activity_ids ?? undefined })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sc = createServiceClient()
  const { error } = await sc.from('employees').delete().eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
