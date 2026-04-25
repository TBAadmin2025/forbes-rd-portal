import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sc = createServiceClient()

  const { data: doc, error: docError } = await sc
    .from('documents')
    .select('storage_path, submission_id, uploaded_by')
    .eq('id', id)
    .single()

  if (docError || !doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  const { data: profile } = await sc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'
  const isUploader = doc.uploaded_by === user.id

  if (!isAdmin && !isUploader) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: signed, error: signError } = await sc.storage
    .from('rd-documents')
    .createSignedUrl(doc.storage_path, 60 * 5)

  if (signError || !signed?.signedUrl) {
    return Response.json(
      { error: signError?.message ?? 'Failed to sign URL' },
      { status: 500 }
    )
  }

  return NextResponse.redirect(signed.signedUrl)
}
