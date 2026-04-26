import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { evaluateSubmission, type AggregateMap, type YearAggregates } from '@/lib/inventory/completeness'

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

  const [submissionsRes, documentsRes, employeesRes] = await Promise.all([
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
  ])

  if (submissionsRes.error) return Response.json({ error: submissionsRes.error.message }, { status: 500 })
  if (documentsRes.error) return Response.json({ error: documentsRes.error.message }, { status: 500 })
  if (employeesRes.error) return Response.json({ error: employeesRes.error.message }, { status: 500 })

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

  const rows = (submissionsRes.data ?? []).map((s) => {
    const completeness = evaluateSubmission(s.tax_years, aggBySubmission.get(s.id) ?? {})
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
