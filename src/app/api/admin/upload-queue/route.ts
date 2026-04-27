import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/admin/upload-queue
// Returns every (submission, year, requirement) where state = 'have' but the
// real artifact isn't in the portal yet. The sidebar pulls the count; the
// upload queue page renders the rows.
//
// Resolution: a 'have' mark is stale once the real artifact is uploaded
// (uploaded > have). Filter those out so the queue only shows items that
// genuinely need work.

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

  const [marksRes, submissionsRes, documentsRes, employeesRes] = await Promise.all([
    serviceClient
      .from('requirement_marks')
      .select('submission_id, tax_year, requirement_key, marked_at, notes')
      .eq('state', 'have'),
    serviceClient
      .from('submissions')
      .select('id, contact_name, company_name, contact_email, status'),
    serviceClient
      .from('documents')
      .select('submission_id, category, tax_year'),
    serviceClient
      .from('employees')
      .select('submission_id, tax_year'),
  ])

  if (marksRes.error) return Response.json({ error: marksRes.error.message }, { status: 500 })
  if (submissionsRes.error) return Response.json({ error: submissionsRes.error.message }, { status: 500 })

  const subById = new Map<string, { id: string; contact_name: string | null; company_name: string | null; contact_email: string | null; status: string }>()
  for (const s of submissionsRes.data ?? []) subById.set(s.id, s)

  // Build a (submission, year) → which requirements are uploaded set so we
  // can filter out marks that are now satisfied by real data.
  const uploadedKeys = new Set<string>()
  const key = (subId: string, year: number, req: string) => `${subId}:${year}:${req}`

  for (const d of documentsRes.data ?? []) {
    if (d.tax_year == null) continue
    if (d.category === 'payroll') uploadedKeys.add(key(d.submission_id, d.tax_year, 'payroll'))
    else if (d.category === 'pandl') uploadedKeys.add(key(d.submission_id, d.tax_year, 'pandl'))
    else if (d.category === 'qre_spreadsheet') uploadedKeys.add(key(d.submission_id, d.tax_year, 'qre'))
  }
  for (const e of employeesRes.data ?? []) {
    if (e.tax_year == null) continue
    uploadedKeys.add(key(e.submission_id, e.tax_year, 'qre'))
  }

  const rows = (marksRes.data ?? [])
    .filter((m) => {
      if (m.tax_year == null) return false
      // Drop marks that are stale (already uploaded).
      return !uploadedKeys.has(key(m.submission_id, m.tax_year, m.requirement_key))
    })
    .map((m) => {
      const sub = subById.get(m.submission_id)
      return {
        submission_id: m.submission_id,
        contact_name: sub?.contact_name ?? null,
        company_name: sub?.company_name ?? null,
        contact_email: sub?.contact_email ?? null,
        status: sub?.status ?? null,
        tax_year: m.tax_year,
        requirement_key: m.requirement_key,
        marked_at: m.marked_at,
        notes: m.notes,
      }
    })
    .sort((a, b) => {
      // Most recently marked first.
      if (a.marked_at && b.marked_at) return b.marked_at.localeCompare(a.marked_at)
      return 0
    })

  return Response.json({ rows, count: rows.length })
}
