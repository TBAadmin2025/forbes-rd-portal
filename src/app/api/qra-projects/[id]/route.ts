import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH — update a project
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const serviceClient = createServiceClient()

  // If body contains challenges array, handle them separately
  if (body.challenges) {
    const challenges = body.challenges
    // Delete existing challenges for this project
    await serviceClient.from('qra_challenges').delete().eq('project_id', id)

    // Insert new ones
    if (challenges.length > 0) {
      await serviceClient.from('qra_challenges').insert(
        challenges.map((c: any, i: number) => ({
          project_id: id,
          technical_problem: c.technical_problem || null,
          why_no_existing_solution: c.why_no_existing_solution || null,
          approaches_tried: c.approaches_tried || null,
          testing_methods: c.testing_methods || null,
          iteration_count: c.iteration_count || null,
          outcome: c.outcome || null,
          sort_order: i,
        }))
      )
    }
    delete body.challenges
  }

  // Update project fields (if any remain)
  if (Object.keys(body).length > 0) {
    const { error } = await serviceClient
      .from('qra_projects')
      .update(body)
      .eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // Return updated project with challenges
  const { data } = await serviceClient
    .from('qra_projects')
    .select('*, qra_challenges(*)')
    .eq('id', id)
    .single()

  return Response.json(data)
}

// DELETE — delete a project (cascades to challenges)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from('qra_projects').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
