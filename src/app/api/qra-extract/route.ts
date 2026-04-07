import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const QRA_PROMPT = `You are extracting Qualified Research Activity (QRA) projects from a business R&D document.

The document contains numbered project sections (1., 2., 3., etc.). Each project may include sections like:
- A brief intro paragraph describing what the company developed
- "Technical Uncertainty" — bullet points
- "Experimentation" — bullet points or phases
- "Findings", "Status", "Impact", "Ongoing Work", "Additional Development" — outcomes

Extract ALL numbered projects from the document. For each project, return a JSON object with these fields:
- project_number (integer, the leading number)
- name (string, the project title after the number)
- description (string, the intro paragraph or summary — combine the description sentences)
- technical_uncertainty (string, all technical uncertainty bullet points joined with newlines, prefixed with "- ")
- experimentation (string, all experimentation/methodology content joined with newlines, prefixed with "- ")
- outcomes (string, any findings/status/impact/ongoing work content joined with newlines)
- raw_text (string, the complete text of this project section as it appears in the PDF)

Return ONLY a valid JSON array of these objects, no other text or markdown formatting.

Example format:
[
  {
    "project_number": 1,
    "name": "Caregiver Scheduling & Coverage Optimization",
    "description": "The company developed and refined scheduling systems...",
    "technical_uncertainty": "- Determining how to prevent missed visits\\n- Identifying the most reliable system",
    "experimentation": "- Initially used manual scheduling\\n- Tested multiple software platforms",
    "outcomes": "Implemented Access Care system with ongoing refinement",
    "raw_text": "1. Caregiver Scheduling & Coverage Optimization\\nThe company developed..."
  }
]`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === '' || apiKey === 'your_anthropic_api_key') {
    return Response.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  // Accept multipart form data with the PDF file
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const submissionId = formData.get('submission_id') as string | null

  if (!file || !submissionId) {
    return Response.json({ error: 'file and submission_id required' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return Response.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  try {
    // Convert PDF to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Content = Buffer.from(arrayBuffer).toString('base64')

    // Optionally upload PDF to storage so we have a record of what was extracted
    const storagePath = `qra-pdfs/${submissionId}/${Date.now()}-${file.name}`
    await supabase.storage.from('rd-documents').upload(storagePath, file, { upsert: true })

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: QRA_PROMPT },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
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
      console.error('Anthropic API error:', errText)
      return Response.json(
        { error: `Extraction API error: ${response.status}` },
        { status: 500 }
      )
    }

    const apiResult = await response.json()
    const textContent = apiResult.content?.[0]?.text || ''

    // Parse JSON from response
    let activities: unknown
    try {
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim()
      activities = JSON.parse(jsonStr)
    } catch {
      console.error('JSON parse error:', textContent)
      return Response.json(
        { error: 'Failed to parse extracted data', raw: textContent },
        { status: 500 }
      )
    }

    if (!Array.isArray(activities)) {
      return Response.json(
        { error: 'Expected an array of activities', raw: activities },
        { status: 500 }
      )
    }

    // Return the parsed activities WITHOUT saving — user reviews on confirmation screen
    return Response.json({
      success: true,
      activities,
      pdf_path: storagePath,
    })
  } catch (err) {
    console.error('QRA extraction error:', err)
    return Response.json(
      { error: 'Extraction failed', details: String(err) },
      { status: 500 }
    )
  }
}
