import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET — list projects for a submission
// Query param: submission_id (required)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const submissionId = request.nextUrl.searchParams.get('submission_id')
  if (!submissionId) return Response.json({ error: 'submission_id required' }, { status: 400 })

  const serviceClient = createServiceClient()

  // Get projects with their challenges
  const { data: projects, error } = await serviceClient
    .from('qra_projects')
    .select('*, qra_challenges(*)')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(projects)
}

// POST — create a new project
// Body: { submission_id, project_name, ...other fields }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { submission_id, project_name, start_date, end_date, description, business_problem, technologies_used, improvements, measurable_outcomes } = body

  if (!submission_id || !project_name) {
    return Response.json({ error: 'submission_id and project_name required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('qra_projects')
    .insert({
      submission_id,
      project_name,
      start_date: start_date || null,
      end_date: end_date || null,
      description: description || null,
      business_problem: business_problem || null,
      technologies_used: technologies_used || null,
      improvements: improvements || null,
      measurable_outcomes: measurable_outcomes || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
