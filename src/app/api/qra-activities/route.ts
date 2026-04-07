import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET — list activities for a submission
export async function GET(request: NextRequest) {
  const submissionId = request.nextUrl.searchParams.get('submission_id')
  if (!submissionId) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  const sc = createServiceClient()
  const { data, error } = await sc
    .from('qra_activities')
    .select('*')
    .eq('submission_id', submissionId)
    .order('project_number', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

// POST — bulk create activities (used by extraction confirmation save)
// Body: { submission_id, activities: [...], replace_existing?: boolean }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { submission_id, activities, replace_existing } = body

  if (!submission_id) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }
  if (!Array.isArray(activities)) {
    return Response.json({ error: 'activities must be an array' }, { status: 400 })
  }

  const sc = createServiceClient()

  // If replace_existing, delete all existing activities for this submission first
  if (replace_existing) {
    await sc.from('qra_activities').delete().eq('submission_id', submission_id)
  }

  if (activities.length === 0) {
    return Response.json({ activities: [] })
  }

  const rows = activities.map((a: Record<string, unknown>) => ({
    submission_id,
    project_number: a.project_number ?? null,
    name: a.name || 'Untitled',
    description: a.description || null,
    technical_uncertainty: a.technical_uncertainty || null,
    experimentation: a.experimentation || null,
    outcomes: a.outcomes || null,
    raw_text: a.raw_text || null,
    ai_extracted: a.ai_extracted ?? true,
  }))

  const { data, error } = await sc.from('qra_activities').insert(rows).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ activities: data })
}

// DELETE — delete all activities for a submission (used before re-extraction)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const submissionId = request.nextUrl.searchParams.get('submission_id')
  if (!submissionId) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  const sc = createServiceClient()
  const { error } = await sc.from('qra_activities').delete().eq('submission_id', submissionId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
