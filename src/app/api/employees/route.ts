import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const serviceClient = createServiceClient()

  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get('submission_id')
  const taxYear = searchParams.get('tax_year')

  if (!submissionId) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  let query = serviceClient
    .from('employees')
    .select('*, employee_year_activities(activity_id)')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (taxYear) {
    query = query.eq('tax_year', parseInt(taxYear))
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Hydrate activity_ids from the junction
  const hydrated = (data || []).map((row) => {
    const junctionRows = (row.employee_year_activities || []) as { activity_id: string }[]
    const activity_ids = junctionRows.map((j) => j.activity_id)
    const { employee_year_activities: _, ...rest } = row
    return { ...rest, activity_ids }
  })

  return Response.json(hydrated)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Never write rd_hours or qualified_amount — they are generated columns
  const { rd_hours: _rh, qualified_amount: _qa, activity_ids, ...insertData } = body

  const sc = createServiceClient()
  const { data, error } = await sc
    .from('employees')
    .insert({
      ...insertData,
      ai_extracted: insertData.ai_extracted ?? false,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Insert junction rows for activity assignments
  if (Array.isArray(activity_ids) && activity_ids.length > 0) {
    const junctionRows = activity_ids.map((activity_id: string) => ({
      employee_id: data.id,
      activity_id,
    }))
    await sc.from('employee_year_activities').insert(junctionRows)
  }

  return Response.json({ ...data, activity_ids: activity_ids || [] })
}
