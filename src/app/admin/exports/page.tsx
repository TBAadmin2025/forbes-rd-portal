'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import type { Submission } from '@/lib/types/database.types'

export default function ExportsPage() {
  const supabase = createClient()
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .not('export_generated_at', 'is', null)
        .order('export_generated_at', { ascending: false })
      if (data) setSubmissions(data as Submission[])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dlBtn = (url: string | null, label: string) => {
    if (!url) return <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm">{label}</Button>
      </a>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
          Export Packages
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
          {submissions.length} export{submissions.length !== 1 ? 's' : ''} generated
        </div>
      </div>

      {submissions.length === 0 ? (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
            No exports yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
            Exports will appear here once generated from the submission detail page.
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--white)', borderRadius: 4, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)' }}>
                {['Client', 'Generated', 'Discovery', 'QRA', 'Summary', 'Excel', 'Docs', 'Package'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: 'var(--champagne)',
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                    <div>{s.contact_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>{s.company_name || ''}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
                    {s.export_generated_at
                      ? new Date(s.export_generated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_discovery_pdf_url, '📋 PDF')}</td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_qra_pdf_url, '🔬 PDF')}</td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_pdf_url, '📄 PDF')}</td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_excel_url, '📊 XLS')}</td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_document_zip_url, '📁 ZIP')}</td>
                  <td style={{ padding: '12px' }}>{dlBtn(s.export_full_package_url, '📦 All')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
