import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET — single article by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const sc = createServiceClient()

  const { data, error } = await sc
    .from('guide_articles')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return Response.json({ error: 'Article not found' }, { status: 404 })
  return Response.json(data)
}

// PATCH — update article (super_admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()
  const { data: profile } = await sc.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can edit articles' }, { status: 403 })
  }

  const body = await request.json()
  const { title, body: articleBody, video_url, category, published, sort_order } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (articleBody !== undefined) updates.body = articleBody
  if (video_url !== undefined) updates.video_url = video_url || null
  if (category !== undefined) updates.category = category
  if (published !== undefined) updates.published = published
  if (sort_order !== undefined) updates.sort_order = sort_order

  const { data, error } = await sc
    .from('guide_articles')
    .update(updates)
    .eq('slug', slug)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// DELETE — delete article (super_admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()
  const { data: profile } = await sc.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can delete articles' }, { status: 403 })
  }

  const { error } = await sc.from('guide_articles').delete().eq('slug', slug)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
