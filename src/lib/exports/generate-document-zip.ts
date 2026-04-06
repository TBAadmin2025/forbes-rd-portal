import JSZip from 'jszip'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function generateDocumentZIP(
  supabase: SupabaseClient,
  documents: Record<string, unknown>[]
): Promise<Buffer> {
  const zip = new JSZip()

  if (documents.length === 0) {
    zip.file('readme.txt', 'No documents were uploaded for this submission.')
    return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>
  }

  // Process in batches of 5
  for (let i = 0; i < documents.length; i += 5) {
    const batch = documents.slice(i, i + 5)
    await Promise.all(batch.map(async (doc) => {
      try {
        const { data, error } = await supabase.storage
          .from('rd-documents')
          .download(doc.storage_path as string)

        if (error) {
          console.error(`Failed to download ${doc.storage_path}: ${error.message}`)
          return
        }

        if (data) {
          const arrayBuffer = await data.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const category = (doc.category as string) || 'uncategorized'
          const taxYear = (doc.tax_year as string) || 'current'
          const fileName = doc.file_name as string

          zip.file(`${category}/${taxYear}/${fileName}`, buffer)
        }
      } catch (err) {
        console.error(`Error processing document ${doc.file_name}:`, err)
      }
    }))
  }

  return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>
}
