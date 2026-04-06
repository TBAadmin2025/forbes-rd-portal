import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET — list articles (published only for admins, all for super_admins)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()
  const { data: profile } = await sc.from('profiles').select('role').eq('id', user.id).single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query = sc.from('guide_articles').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })

  // Admins only see published, super_admins see everything
  if (profile.role !== 'super_admin') {
    query.eq('published', true)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST — create article (super_admin only)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()
  const { data: profile } = await sc.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    return Response.json({ error: 'Only super admins can create articles' }, { status: 403 })
  }

  const body = await request.json()
  const { title, slug, body: articleBody, video_url, category, published } = body

  if (!title || !slug) {
    return Response.json({ error: 'Title and slug are required' }, { status: 400 })
  }

  const { data, error } = await sc
    .from('guide_articles')
    .insert({
      title,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      body: articleBody || '',
      video_url: video_url || null,
      category: category || 'Getting Started',
      published: published ?? false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
