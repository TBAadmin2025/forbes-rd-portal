import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExcel } from '@/lib/exports/generate-excel'
import { generateDocumentZIP } from '@/lib/exports/generate-document-zip'
import JSZip from 'jszip'

// The partner package is exactly two artifacts:
//   1. <Company>-QRE-Spreadsheet.xlsx — in the partner-facing template shape
//   2. <Company>-Supporting-Docs.zip   — every uploaded supporting document
// They are also bundled together as <Company>-Full-Export-Package.zip for
// convenience. Older summary/discovery/QRA PDFs were retired — the
// spreadsheet is the contract with the partner; the portal is just a UI.

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { submission_id } = body as { submission_id?: string }

  if (!submission_id) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  try {
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (subErr || !submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { data: employees } = await supabase
      .from('employees')
      .select('tax_year, full_name, employee_type, state, total_wages, rd_percentage, project_name')
      .eq('submission_id', submission_id)
      .order('tax_year', { ascending: true })

    const { data: supplies } = await supabase
      .from('supplies')
      .select('tax_year, description, project_name, amount')
      .eq('submission_id', submission_id)
      .order('tax_year', { ascending: true })

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('submission_id', submission_id)

    const docs = documents || []

    // Filename slug — strip everything but alphanum, spaces, hyphens; collapse spaces to hyphens.
    const clientSlug = (submission.contact_name || submission.company_name || 'Client')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

    const basePath = `exports/${submission_id}`
    const results: Record<string, string> = {}
    const generatedFiles: { name: string; buffer: Buffer; contentType: string }[] = []

    // 1. QRE Spreadsheet (partner-facing template shape)
    try {
      const excelBuffer = generateExcel({
        submission,
        employees: employees || [],
        supplies: supplies || [],
      })
      const fileName = `${clientSlug}-QRE-Spreadsheet.xlsx`
      const path = `${basePath}/${fileName}`
      await supabase.storage.from('rd-documents').upload(path, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      })
      const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
      results.excel_url = signed?.signedUrl || ''
      generatedFiles.push({
        name: fileName,
        buffer: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    } catch (e) {
      console.error('QRE spreadsheet generation failed:', e)
    }

    // 2. Supporting Documents ZIP (all uploaded files, organized by category/year)
    if (docs.length > 0) {
      try {
        const zipBuffer = await generateDocumentZIP(supabase, docs)
        const fileName = `${clientSlug}-Supporting-Docs.zip`
        const path = `${basePath}/${fileName}`
        await supabase.storage.from('rd-documents').upload(path, zipBuffer, {
          contentType: 'application/zip',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.document_zip_url = signed?.signedUrl || ''
        generatedFiles.push({ name: fileName, buffer: zipBuffer, contentType: 'application/zip' })
      } catch (e) {
        console.error('Supporting docs ZIP generation failed:', e)
      }
    }

    // 3. Full package — bundle the two together for one-click download
    if (generatedFiles.length >= 2) {
      try {
        const fullZip = new JSZip()
        for (const file of generatedFiles) {
          fullZip.file(file.name, file.buffer)
        }
        const fullZipBuffer = Buffer.from(await fullZip.generateAsync({ type: 'nodebuffer' }))
        const path = `${basePath}/${clientSlug}-Full-Export-Package.zip`
        await supabase.storage.from('rd-documents').upload(path, fullZipBuffer, {
          contentType: 'application/zip',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.full_package_url = signed?.signedUrl || ''
      } catch (e) {
        console.error('Full package ZIP failed:', e)
      }
    }

    await supabase
      .from('submissions')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        export_generated_at: new Date().toISOString(),
        export_excel_url: results.excel_url || submission.export_excel_url,
        export_document_zip_url: results.document_zip_url || submission.export_document_zip_url,
        export_full_package_url: results.full_package_url || submission.export_full_package_url,
      })
      .eq('id', submission_id)

    return Response.json({ success: true, ...results })
  } catch (err) {
    console.error('Export generation error:', err)
    return Response.json(
      { error: 'Export generation failed', details: String(err) },
      { status: 500 }
    )
  }
}
