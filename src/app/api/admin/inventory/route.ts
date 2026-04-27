import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { evaluateSubmission, markKey, type AggregateMap, type MarkMap, type RequirementKey, type YearAggregates } from '@/lib/inventory/completeness'

export async function GET() {
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

  const [submissionsRes, documentsRes, employeesRes, marksRes] = await Promise.all([
    serviceClient
      .from('submissions')
      .select('id, contact_name, company_name, contact_email, status, tax_years, admin_notes, last_active_at, client_user_id')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('documents')
      .select('submission_id, category, tax_year'),
    serviceClient
      .from('employees')
      .select('submission_id, tax_year'),
    serviceClient
      .from('requirement_marks')
      .select('submission_id, tax_year, requirement_key, state'),
  ])

  if (submissionsRes.error) return Response.json({ error: submissionsRes.error.message }, { status: 500 })
  if (documentsRes.error) return Response.json({ error: documentsRes.error.message }, { status: 500 })
  if (employeesRes.error) return Response.json({ error: employeesRes.error.message }, { status: 500 })
  if (marksRes.error) return Response.json({ error: marksRes.error.message }, { status: 500 })

  const aggBySubmission = new Map<string, AggregateMap>()

  const ensure = (subId: string, year: number): YearAggregates => {
    let map = aggBySubmission.get(subId)
    if (!map) {
      map = {}
      aggBySubmission.set(subId, map)
    }
    if (!map[year]) {
      map[year] = {
        payrollDocs: 0,
        pandlDocs: 0,
        grossReceiptsDocs: 0,
        qreSpreadsheetDocs: 0,
        employeeRows: 0,
      }
    }
    return map[year]
  }

  for (const d of documentsRes.data ?? []) {
    if (d.tax_year == null) continue
    const a = ensure(d.submission_id, d.tax_year)
    if (d.category === 'payroll') a.payrollDocs += 1
    else if (d.category === 'pandl') a.pandlDocs += 1
    else if (d.category === 'gross_receipts') a.grossReceiptsDocs += 1
    else if (d.category === 'qre_spreadsheet') a.qreSpreadsheetDocs += 1
  }

  for (const e of employeesRes.data ?? []) {
    if (e.tax_year == null) continue
    const a = ensure(e.submission_id, e.tax_year)
    a.employeeRows += 1
  }

  // Group manual marks by submission so each completeness call only sees
  // its own client's overrides.
  const marksBySubmission = new Map<string, MarkMap>()
  for (const m of marksRes.data ?? []) {
    if (m.tax_year == null) continue
    const reqKey = m.requirement_key as RequirementKey
    if (reqKey !== 'payroll' && reqKey !== 'pandl' && reqKey !== 'qre') continue
    const state = m.state === 'have' || m.state === 'n_a' ? m.state : null
    if (!state) continue
    let map = marksBySubmission.get(m.submission_id)
    if (!map) {
      map = {}
      marksBySubmission.set(m.submission_id, map)
    }
    map[markKey(m.tax_year, reqKey)] = state
  }

  const rows = (submissionsRes.data ?? []).map((s) => {
    const completeness = evaluateSubmission(
      s.tax_years,
      aggBySubmission.get(s.id) ?? {},
      marksBySubmission.get(s.id) ?? {},
    )
    return {
      id: s.id,
      contact_name: s.contact_name,
      company_name: s.company_name,
      contact_email: s.contact_email,
      status: s.status,
      tax_years: s.tax_years ?? [],
      admin_notes: s.admin_notes,
      last_active_at: s.last_active_at,
      has_portal_access: !!s.client_user_id,
      completeness,
    }
  })

  return Response.json({ rows })
}
