import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExcel } from '@/lib/exports/generate-excel'
import { generateSummaryPDF } from '@/lib/exports/generate-summary-pdf'
import { generateDiscoveryPDF } from '@/lib/exports/generate-discovery-pdf'
import { generateDocumentZIP } from '@/lib/exports/generate-document-zip'
import JSZip from 'jszip'

interface ExportItems {
  summary_pdf?: boolean
  excel?: boolean
  discovery_pdf?: boolean
  document_zip?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { submission_id, items } = body as { submission_id: string; items?: ExportItems }

  if (!submission_id) {
    return Response.json({ error: 'submission_id required' }, { status: 400 })
  }

  // Default: generate everything if no items specified
  const selected: ExportItems = items || {
    summary_pdf: true,
    excel: true,
    discovery_pdf: true,
    document_zip: true,
  }

  try {
    // Step 1 — Query all data
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
      .select('*')
      .eq('submission_id', submission_id)
      .order('tax_year', { ascending: true })

    const { data: supplies } = await supabase
      .from('supplies')
      .select('*')
      .eq('submission_id', submission_id)
      .order('tax_year', { ascending: true })

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('submission_id', submission_id)

    const { data: qreSummary } = await supabase
      .from('qre_summary')
      .select('*')
      .eq('submission_id', submission_id)
      .order('tax_year', { ascending: true })

    const { data: creditEstimates } = await supabase
      .from('credit_estimates')
      .select('*')
      .eq('submission_id', submission_id)

    const emps = employees || []
    const sups = supplies || []
    const docs = documents || []
    const summaries = qreSummary || []
    const credits = creditEstimates || []

    const qreByYear: Record<number, number> = {}
    summaries.forEach((s: { tax_year: number | null; total_qre: number }) => {
      if (s.tax_year) qreByYear[s.tax_year] = s.total_qre || 0
    })
    const totalQRE = Object.values(qreByYear).reduce((a, b) => a + b, 0)

    // Step 2 — Generate selected items
    const results: Record<string, string> = {}
    const generatedFiles: { name: string; buffer: Buffer; contentType: string }[] = []

    const basePath = `exports/${submission_id}`

    // Excel
    if (selected.excel) {
      try {
        const excelBuffer = generateExcel({
          submission, employees: emps, supplies: sups,
          summaries, qreByYear, totalQRE,
        })
        const path = `${basePath}/data.xlsx`
        await supabase.storage.from('rd-documents').upload(path, excelBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.excel_url = signed?.signedUrl || ''
        generatedFiles.push({ name: 'data.xlsx', buffer: excelBuffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      } catch (e) {
        console.error('Excel generation failed:', e)
      }
    }

    // Summary PDF
    if (selected.summary_pdf) {
      try {
        const pdfBuffer = await generateSummaryPDF({
          submission, employees: emps, supplies: sups,
          documents: docs, summaries, credits, qreByYear, totalQRE,
        })
        const path = `${basePath}/summary-report.pdf`
        await supabase.storage.from('rd-documents').upload(path, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.pdf_url = signed?.signedUrl || ''
        generatedFiles.push({ name: 'summary-report.pdf', buffer: pdfBuffer, contentType: 'application/pdf' })
      } catch (e) {
        console.error('Summary PDF generation failed:', e)
      }
    }

    // Discovery PDF
    if (selected.discovery_pdf) {
      try {
        const discoveryBuffer = await generateDiscoveryPDF(submission)
        const path = `${basePath}/discovery-questionnaire.pdf`
        await supabase.storage.from('rd-documents').upload(path, discoveryBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.discovery_pdf_url = signed?.signedUrl || ''
        generatedFiles.push({ name: 'discovery-questionnaire.pdf', buffer: discoveryBuffer, contentType: 'application/pdf' })
      } catch (e) {
        console.error('Discovery PDF generation failed:', e)
      }
    }

    // Document ZIP
    if (selected.document_zip && docs.length > 0) {
      try {
        const zipBuffer = await generateDocumentZIP(supabase, docs)
        const path = `${basePath}/documents.zip`
        await supabase.storage.from('rd-documents').upload(path, zipBuffer, {
          contentType: 'application/zip',
          upsert: true,
        })
        const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
        results.document_zip_url = signed?.signedUrl || ''
        generatedFiles.push({ name: 'documents.zip', buffer: zipBuffer, contentType: 'application/zip' })
      } catch (e) {
        console.error('Document ZIP generation failed:', e)
      }
    }

    // Full package ZIP (when 2+ items generated)
    if (generatedFiles.length >= 2) {
      try {
        const fullZip = new JSZip()
        for (const file of generatedFiles) {
          fullZip.file(file.name, file.buffer)
        }
        const fullZipBuffer = Buffer.from(await fullZip.generateAsync({ type: 'nodebuffer' }))
        const path = `${basePath}/full-package.zip`
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

    // Step 3 — Update submission record
    await supabase
      .from('submissions')
      .update({
        export_generated_at: new Date().toISOString(),
        export_pdf_url: results.pdf_url || submission.export_pdf_url,
        export_excel_url: results.excel_url || submission.export_excel_url,
        export_discovery_pdf_url: results.discovery_pdf_url || submission.export_discovery_pdf_url,
        export_document_zip_url: results.document_zip_url || submission.export_document_zip_url,
        export_full_package_url: results.full_package_url || submission.export_full_package_url,
      })
      .eq('id', submission_id)

    return Response.json({
      success: true,
      ...results,
    })
  } catch (err) {
    console.error('Export generation error:', err)
    return Response.json(
      { error: 'Export generation failed', details: String(err) },
      { status: 500 }
    )
  }
}
