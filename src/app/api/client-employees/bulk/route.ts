import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface BulkRow {
  full_name: string
  employee_type: 'Employee' | 'Contractor'
  state: string
  years_worked: number[]
}

// POST — bulk-create master employees + sync per-year employee rows.
// Body: { submission_id, rows: BulkRow[] }
// Skips rows whose name already exists in this submission.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { submission_id, rows } = body as { submission_id: string; rows: BulkRow[] }

  if (!submission_id || !Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'submission_id and non-empty rows required' }, { status: 400 })
  }

  const sc = createServiceClient()

  // Re-check duplicates server-side (don't trust client)
  const { data: existing } = await sc
    .from('client_employees')
    .select('full_name')
    .eq('submission_id', submission_id)

  const existingSet = new Set(
    (existing || []).map((e: { full_name: string }) => e.full_name.toLowerCase().trim()),
  )

  const toInsert: BulkRow[] = []
  const skipped: { full_name: string; reason: string }[] = []

  for (const r of rows) {
    if (!r.full_name?.trim() || !Array.isArray(r.years_worked) || r.years_worked.length === 0) {
      skipped.push({ full_name: r.full_name || '(blank)', reason: 'Missing required fields' })
      continue
    }
    const key = r.full_name.toLowerCase().trim()
    if (existingSet.has(key)) {
      skipped.push({ full_name: r.full_name, reason: 'Already exists' })
      continue
    }
    existingSet.add(key)
    toInsert.push(r)
  }

  if (toInsert.length === 0) {
    return Response.json({ created: [], skipped, count: 0 })
  }

  // Insert master rows
  const masterPayload = toInsert.map((r) => ({
    submission_id,
    full_name: r.full_name.trim(),
    employee_type: r.employee_type,
    state: r.state,
    years_worked: r.years_worked,
  }))

  const { data: created, error: createErr } = await sc
    .from('client_employees')
    .insert(masterPayload)
    .select()

  if (createErr) {
    return Response.json({ error: createErr.message }, { status: 500 })
  }

  // Build per-year employee rows for everyone we just created
  const yearRows: Record<string, unknown>[] = []
  for (const master of created || []) {
    const years: number[] = master.years_worked || []
    for (const year of years) {
      yearRows.push({
        submission_id,
        client_employee_id: master.id,
        tax_year: year,
        full_name: master.full_name,
        employee_type: master.employee_type,
        state: master.state || 'Georgia',
        total_wages: 0,
        total_hours_worked: null,
        rd_percentage: null,
        project_name: null,
      })
    }
  }
  if (yearRows.length > 0) {
    await sc.from('employees').insert(yearRows)
  }

  return Response.json({
    created: created || [],
    skipped,
    count: (created || []).length,
  })
}
