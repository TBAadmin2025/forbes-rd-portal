import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET — list master employees for a submission
export async function GET(request: NextRequest) {
  const submissionId = request.nextUrl.searchParams.get('submission_id')
  if (!submissionId) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  const sc = createServiceClient()
  const { data, error } = await sc
    .from('client_employees')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

// POST — create master employee + sync per-year employee rows
// Body: { submission_id, full_name, employee_type, state, years_worked: number[] }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { submission_id, full_name, employee_type = 'Employee', state, years_worked = [] } = body

  if (!submission_id || !full_name) {
    return Response.json({ error: 'submission_id and full_name required' }, { status: 400 })
  }

  const sc = createServiceClient()

  // Create master record
  const { data: master, error: masterErr } = await sc
    .from('client_employees')
    .insert({ submission_id, full_name, employee_type, state, years_worked })
    .select()
    .single()

  if (masterErr) return Response.json({ error: masterErr.message }, { status: 500 })

  // Create per-year employee rows for each year in years_worked
  if (Array.isArray(years_worked) && years_worked.length > 0) {
    const yearRows = years_worked.map((year: number) => ({
      submission_id,
      client_employee_id: master.id,
      tax_year: year,
      full_name,
      employee_type,
      state: state || 'Georgia',
      total_wages: 0,
      total_hours_worked: null,
      rd_percentage: null,
      project_name: null,
    }))
    await sc.from('employees').insert(yearRows)
  }

  return Response.json(master)
}
