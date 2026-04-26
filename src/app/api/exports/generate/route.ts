import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExcel } from '@/lib/exports/generate-excel'
import { generateDocumentZIP } from '@/lib/exports/generate-document-zip'
import { generateSummaryPDF } from '@/lib/exports/generate-summary-pdf'
import { generateDiscoveryPDF } from '@/lib/exports/generate-discovery-pdf'
import { generateQRAPDF } from '@/lib/exports/generate-qra-pdf'
import JSZip from 'jszip'

// Partner package (sent to outside partner): exactly two artifacts —
//   1. <Company>-QRE-Spreadsheet.xlsx — partner-facing template shape
//   2. <Company>-Supporting-Docs.zip   — every uploaded supporting document
// Bundled together as <Company>-Full-Export-Package.zip for one-click send.
//
// Internal reports (Forbes team only — NOT in partner zip):
//   - Summary PDF (credit ballpark, QRE breakdown)
//   - Discovery Questionnaire PDF (filled responses)
//   - QRA Project Report PDF (R&D narratives)
// Generated alongside the partner package; downloaded from the panel as
// separate links. Useful for internal review and giving the client a sense
// of qualification before partners get involved.

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

    const [
      { data: employees },
      { data: supplies },
      { data: documents },
      { data: qreSummary },
      { data: creditEstimates },
      { data: filingHistory },
      { data: qraActivities },
    ] = await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .eq('submission_id', submission_id)
        .order('tax_year', { ascending: true }),
      supabase
        .from('supplies')
        .select('*')
        .eq('submission_id', submission_id)
        .order('tax_year', { ascending: true }),
      supabase
        .from('documents')
        .select('*')
        .eq('submission_id', submission_id),
      supabase
        .from('qre_summary')
        .select('*')
        .eq('submission_id', submission_id)
        .order('tax_year', { ascending: true }),
      supabase
        .from('credit_estimates')
        .select('*')
        .eq('submission_id', submission_id),
      supabase
        .from('submission_filing_history')
        .select('*')
        .eq('submission_id', submission_id)
        .order('tax_year', { ascending: true }),
      supabase
        .from('qra_activities')
        .select('*')
        .eq('submission_id', submission_id)
        .order('project_number', { ascending: true }),
    ])

    const docs = documents || []
    const emps = employees || []
    const sups = supplies || []
    const summaries = qreSummary || []
    const credits = creditEstimates || []
    const projects = qraActivities || []

    const qreByYear: Record<number, number> = {}
    for (const s of summaries as Array<{ tax_year: number | null; total_qre: number | null }>) {
      if (s.tax_year) qreByYear[s.tax_year] = s.total_qre || 0
    }
    const totalQRE = Object.values(qreByYear).reduce((a, b) => a + b, 0)

    // Filename slug — strip everything but alphanum, spaces, hyphens; collapse spaces to hyphens.
    const clientSlug = (submission.contact_name || submission.company_name || 'Client')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

    const basePath = `exports/${submission_id}`
    const results: Record<string, string> = {}
    // Files that go in the partner package zip — only QRE spreadsheet + supporting docs zip.
    const partnerFiles: { name: string; buffer: Buffer; contentType: string }[] = []

    async function uploadAndSign(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
      const path = `${basePath}/${fileName}`
      await supabase.storage.from('rd-documents').upload(path, buffer, { contentType, upsert: true })
      const { data: signed } = await supabase.storage.from('rd-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
      return signed?.signedUrl || ''
    }

    // ============= PARTNER PACKAGE =============

    // 1. QRE Spreadsheet (partner-facing template shape)
    try {
      const excelBuffer = generateExcel({
        submission,
        employees: emps,
        supplies: sups,
      })
      const fileName = `${clientSlug}-QRE-Spreadsheet.xlsx`
      results.excel_url = await uploadAndSign(
        excelBuffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      partnerFiles.push({
        name: fileName,
        buffer: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    } catch (e) {
      console.error('QRE spreadsheet generation failed:', e)
    }

    // 2. Supporting Documents ZIP
    if (docs.length > 0) {
      try {
        const zipBuffer = await generateDocumentZIP(supabase, docs)
        const fileName = `${clientSlug}-Supporting-Docs.zip`
        results.document_zip_url = await uploadAndSign(zipBuffer, fileName, 'application/zip')
        partnerFiles.push({ name: fileName, buffer: zipBuffer, contentType: 'application/zip' })
      } catch (e) {
        console.error('Supporting docs ZIP generation failed:', e)
      }
    }

    // 3. Full partner package ZIP — bundles only the two partner files above.
    if (partnerFiles.length >= 2) {
      try {
        const fullZip = new JSZip()
        for (const file of partnerFiles) {
          fullZip.file(file.name, file.buffer)
        }
        const fullZipBuffer = Buffer.from(await fullZip.generateAsync({ type: 'nodebuffer' }))
        results.full_package_url = await uploadAndSign(
          fullZipBuffer,
          `${clientSlug}-Full-Export-Package.zip`,
          'application/zip',
        )
      } catch (e) {
        console.error('Partner package ZIP failed:', e)
      }
    }

    // ============= INTERNAL REPORTS (Forbes only) =============

    // Hydrate employees with activity_names for the summary PDF.
    const activityMap: Record<string, string> = {}
    for (const a of projects as Array<{ id: string; name: string; project_number: number | null }>) {
      activityMap[a.id] = a.project_number ? `${a.project_number}. ${a.name}` : a.name
    }

    // 4. Summary PDF — credit ballpark, used internally to give the client a sense of qualification.
    try {
      const pdfBuffer = await generateSummaryPDF({
        submission,
        employees: emps as Record<string, unknown>[],
        supplies: sups as Record<string, unknown>[],
        documents: docs,
        summaries,
        credits,
        qreByYear,
        totalQRE,
      })
      results.pdf_url = await uploadAndSign(pdfBuffer, `${clientSlug}-RD-Summary-Report.pdf`, 'application/pdf')
    } catch (e) {
      console.error('Summary PDF generation failed:', e)
    }

    // 5. Discovery Questionnaire PDF — internal record of the filled questionnaire.
    try {
      const discoveryBuffer = await generateDiscoveryPDF(submission, filingHistory || [])
      results.discovery_pdf_url = await uploadAndSign(
        discoveryBuffer,
        `${clientSlug}-Discovery-Questionnaire.pdf`,
        'application/pdf',
      )
    } catch (e) {
      console.error('Discovery PDF generation failed:', e)
    }

    // 6. QRA Project Report PDF — internal narrative report.
    if (projects.length > 0) {
      try {
        const qraBuffer = await generateQRAPDF(submission, projects)
        results.qra_pdf_url = await uploadAndSign(
          qraBuffer,
          `${clientSlug}-QRA-Project-Report.pdf`,
          'application/pdf',
        )
      } catch (e) {
        console.error('QRA PDF generation failed:', e)
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
        export_pdf_url: results.pdf_url || submission.export_pdf_url,
        export_discovery_pdf_url: results.discovery_pdf_url || submission.export_discovery_pdf_url,
        export_qra_pdf_url: results.qra_pdf_url || submission.export_qra_pdf_url,
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
