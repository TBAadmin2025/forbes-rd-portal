import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PROMPTS: Record<string, string> = {
  payroll:
    'You are extracting payroll data from a business document. Extract all employee and contractor records. For each person return a JSON array with objects containing: full_name (string), employee_type ("Employee" or "Contractor"), state (US state name, default Georgia if unclear), total_wages (number, annual W2 or 1099 amount), total_hours_worked (number, annual hours, use 2080 as default if not found), rd_percentage (number 0-100, percentage of time on R&D activities — use your best estimate based on context if not explicit), project_name (string, R&D project or activity name), tax_year (number). Return ONLY valid JSON array, no other text.',
  pandl:
    'You are extracting financial data from a Profit & Loss or expense report. Extract: 1) gross_receipts by year as object mapping year to amount. 2) rd_supplies as array of objects with description (string), amount (number), project_name (string), tax_year (number) — only include items that could be R&D supplies, materials, software, or technology expenses. Return ONLY valid JSON with keys gross_receipts and rd_supplies, no other text.',
  taxid:
    'Extract the Federal EIN number and business legal name from this document. Return ONLY valid JSON with keys fein (string, format XX-XXXXXXX) and company_name (string), no other text.',
}

function getMediaType(fileType: string | null): string {
  if (!fileType) return 'application/pdf'
  const map: Record<string, string> = {
    'application/pdf': 'application/pdf',
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'text/csv': 'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/pdf',
    'application/vnd.ms-excel': 'application/pdf',
  }
  return map[fileType] || 'application/pdf'
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
  const { submission_id, document_ids } = body as {
    submission_id: string
    document_ids: string[]
  }

  if (!submission_id || !document_ids || document_ids.length === 0) {
    return Response.json(
      { error: 'submission_id and document_ids required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === '' || apiKey === 'your_anthropic_api_key') {
    return Response.json(
      { error: 'Anthropic API key not configured' },
      { status: 500 }
    )
  }

  const allEmployees: Record<string, unknown>[] = []
  const allSupplies: Record<string, unknown>[] = []
  const grossReceipts: Record<number, number> = {}
  const updatedFields: string[] = []
  const errors: { document_id: string; error: string }[] = []

  for (const docId of document_ids) {
    try {
      // Fetch document record
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single()

      if (docErr || !doc) {
        errors.push({ document_id: docId, error: 'Document not found' })
        continue
      }

      // Skip categories without extraction prompts
      const prompt = PROMPTS[doc.category]
      if (!prompt) {
        await supabase
          .from('documents')
          .update({ extraction_status: 'skipped' })
          .eq('id', docId)
        continue
      }

      // Update status to processing
      await supabase
        .from('documents')
        .update({ extraction_status: 'processing' })
        .eq('id', docId)

      // Download file from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from('rd-documents')
        .download(doc.storage_path)

      if (dlErr || !fileData) {
        await supabase
          .from('documents')
          .update({ extraction_status: 'failed' })
          .eq('id', docId)
        errors.push({ document_id: docId, error: 'Failed to download file' })
        continue
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const base64Content = Buffer.from(arrayBuffer).toString('base64')
      const mediaType = getMediaType(doc.file_type)

      // Call Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Content,
                  },
                },
              ],
            },
          ],
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`Anthropic API error for doc ${docId}:`, errText)
        await supabase
          .from('documents')
          .update({ extraction_status: 'failed' })
          .eq('id', docId)
        errors.push({ document_id: docId, error: `API error: ${response.status}` })
        continue
      }

      const apiResult = await response.json()
      const textContent = apiResult.content?.[0]?.text || ''

      // Parse JSON from response
      let parsed: unknown
      try {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/)
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim()
        parsed = JSON.parse(jsonStr)
      } catch {
        console.error(`JSON parse error for doc ${docId}:`, textContent)
        await supabase
          .from('documents')
          .update({
            extraction_status: 'failed',
            extraction_result: { raw: textContent, error: 'JSON parse error' },
          })
          .eq('id', docId)
        errors.push({ document_id: docId, error: 'Failed to parse AI response' })
        continue
      }

      // Process based on category
      if (doc.category === 'payroll' && Array.isArray(parsed)) {
        for (const emp of parsed) {
          const { data: inserted } = await supabase
            .from('employees')
            .insert({
              submission_id,
              tax_year: emp.tax_year || doc.tax_year || 2025,
              full_name: emp.full_name || 'Unknown',
              employee_type: emp.employee_type === 'Contractor' ? 'Contractor' : 'Employee',
              state: emp.state || 'Georgia',
              total_wages: Number(emp.total_wages) || 0,
              total_hours_worked: Number(emp.total_hours_worked) || 2080,
              rd_percentage: Number(emp.rd_percentage) || 0,
              project_name: emp.project_name || null,
              ai_extracted: true,
              ai_confidence: 'high',
            })
            .select()
            .single()

          if (inserted) allEmployees.push(inserted)
        }
        updatedFields.push('employees')
      } else if (doc.category === 'pandl' && typeof parsed === 'object' && parsed !== null) {
        const pandlData = parsed as {
          gross_receipts?: Record<string, number>
          rd_supplies?: Array<{
            description: string
            amount: number
            project_name?: string
            tax_year?: number
          }>
        }

        // Upsert gross receipts
        if (pandlData.gross_receipts) {
          for (const [yearStr, amount] of Object.entries(pandlData.gross_receipts)) {
            const yr = parseInt(yearStr)
            if (isNaN(yr)) continue
            grossReceipts[yr] = Number(amount) || 0

            await supabase
              .from('gross_receipts')
              .upsert(
                {
                  submission_id,
                  tax_year: yr,
                  amount: Number(amount) || 0,
                },
                { onConflict: 'submission_id,tax_year' }
              )
          }
          updatedFields.push('gross_receipts')
        }

        // Upsert supplies
        if (pandlData.rd_supplies && Array.isArray(pandlData.rd_supplies)) {
          for (const sup of pandlData.rd_supplies) {
            const { data: inserted } = await supabase
              .from('supplies')
              .insert({
                submission_id,
                tax_year: sup.tax_year || doc.tax_year || 2025,
                description: sup.description || 'R&D Supply',
                project_name: sup.project_name || null,
                amount: Number(sup.amount) || 0,
                ai_extracted: true,
                ai_confidence: 'high',
              })
              .select()
              .single()

            if (inserted) allSupplies.push(inserted)
          }
          updatedFields.push('supplies')
        }
      } else if (doc.category === 'taxid' && typeof parsed === 'object' && parsed !== null) {
        const taxData = parsed as { fein?: string; company_name?: string }

        // Only update if fields are currently empty
        const { data: currentSub } = await supabase
          .from('submissions')
          .select('fein, company_name')
          .eq('id', submission_id)
          .single()

        const updates: Record<string, string> = {}
        if (taxData.fein && !currentSub?.fein) {
          updates.fein = taxData.fein
          updatedFields.push('fein')
        }
        if (taxData.company_name && !currentSub?.company_name) {
          updates.company_name = taxData.company_name
          updatedFields.push('company_name')
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('submissions')
            .update(updates)
            .eq('id', submission_id)
        }
      }

      // Update document as complete
      await supabase
        .from('documents')
        .update({
          extraction_status: 'complete',
          extraction_result: parsed,
        })
        .eq('id', docId)
    } catch (err) {
      console.error(`Extraction error for doc ${docId}:`, err)
      await supabase
        .from('documents')
        .update({ extraction_status: 'failed' })
        .eq('id', docId)
      errors.push({ document_id: docId, error: String(err) })
    }
  }

  return Response.json({
    employees: allEmployees,
    supplies: allSupplies,
    gross_receipts: grossReceipts,
    updated_fields: [...new Set(updatedFields)],
    errors: errors.length > 0 ? errors : undefined,
  })
}
