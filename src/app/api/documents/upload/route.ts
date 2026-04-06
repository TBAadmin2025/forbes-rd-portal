import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const submissionId = formData.get('submission_id') as string | null
  const category = formData.get('category') as string | null
  const taxYear = formData.get('tax_year') as string | null

  if (!file || !submissionId || !category) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const yearPath = taxYear && taxYear !== 'current' ? taxYear : 'current'
  const storagePath = `submissions/${submissionId}/${category}/${yearPath}/${file.name}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      upsert: true,
    })

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath)

  // Insert document record
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      submission_id: submissionId,
      uploaded_by: user.id,
      category,
      tax_year: taxYear && taxYear !== 'current' ? parseInt(taxYear) : null,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: storagePath,
      storage_url: urlData.publicUrl,
      extraction_status: 'pending',
    })
    .select()
    .single()

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 })
  }

  return Response.json({
    document_id: doc.id,
    storage_url: urlData.publicUrl,
    file_name: file.name,
  })
}
