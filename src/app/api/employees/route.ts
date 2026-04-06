import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const serviceClient = createServiceClient()

  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get('submission_id')
  const taxYear = searchParams.get('tax_year')

  if (!submissionId) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  let query = serviceClient
    .from('employees')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })

  if (taxYear) {
    query = query.eq('tax_year', parseInt(taxYear))
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Never write rd_hours or qualified_amount — they are generated columns
  const { rd_hours: _rh, qualified_amount: _qa, ...insertData } = body

  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...insertData,
      ai_extracted: insertData.ai_extracted ?? false,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
