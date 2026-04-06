'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/shared/Card'
import FormField from '@/components/shared/FormField'
import Button from '@/components/shared/Button'
import Tag from '@/components/shared/Tag'
import InfoBox from '@/components/shared/InfoBox'
import YearBlock from '@/components/portal/YearBlock'
import UploadCategory from '@/components/portal/UploadCategory'
import UploadModal from '@/components/portal/UploadModal'
import ExtractionProgress from '@/components/portal/ExtractionProgress'
import type { UploadedFile } from '@/components/portal/UploadCategory'
import type { Employee, Supply, Submission } from '@/lib/types/database.types'
import { formatCurrency } from '@/lib/utils/formatting'

type Category = 'payroll' | 'pandl' | 'taxid' | 'gross_receipts'
const CATEGORIES: Category[] = ['payroll', 'pandl', 'taxid', 'gross_receipts']
const YEARS = [2025, 2024, 2023, 2022]

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

type Section = 'info' | 'data' | 'review'

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('info')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Company info fields
  const [companyName, setCompanyName] = useState('')
  const [dbaName, setDbaName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [fein, setFein] = useState('')
  const [stateTaxId, setStateTaxId] = useState('')
  const [businessState, setBusinessState] = useState('Georgia')
  const [contactPhone, setContactPhone] = useState('')

  // Data entry — mode toggle
  const [dataMode, setDataMode] = useState<'upload' | 'manual'>('manual')

  // Upload state
  const [files, setFiles] = useState<Record<Category, UploadedFile[]>>({
    payroll: [], pandl: [], taxid: [], gross_receipts: [],
  })
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [showExtraction, setShowExtraction] = useState(false)
  const [extractionDone, setExtractionDone] = useState(false)

  // Manual state
  const [employeesByYear, setEmployeesByYear] = useState<Record<number, Employee[]>>({})
  const [suppliesByYear, setSuppliesByYear] = useState<Record<number, Supply[]>>({})

  // Load everything
  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', id)
        .single()
      if (!sub) return
      setSubmission(sub as Submission)

      // Populate company fields
      setCompanyName(sub.company_name || '')
      setDbaName(sub.dba_name || '')
      setContactName(sub.contact_name || '')
      setContactEmail(sub.contact_email || '')
      setFein(sub.fein || '')
      setStateTaxId(sub.state_tax_id || '')
      setBusinessState(sub.business_state || 'Georgia')
      setContactPhone(sub.contact_phone || '')

      if (sub.submission_method === 'upload') setDataMode('upload')

      // Load existing documents
      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('submission_id', id)
      if (docs) {
        const grouped: Record<Category, UploadedFile[]> = {
          payroll: [], pandl: [], taxid: [], gross_receipts: [],
        }
        for (const d of docs) {
          const cat = d.category as Category
          if (grouped[cat]) {
            grouped[cat].push({
              name: d.file_name,
              year: d.tax_year,
            })
          }
        }
        setFiles(grouped)
      }

      // Load employees + supplies
      for (const year of YEARS) {
        const { data: emps } = await supabase
          .from('employees')
          .select('*')
          .eq('submission_id', id)
          .eq('tax_year', year)
        if (emps?.length) {
          setEmployeesByYear(prev => ({ ...prev, [year]: emps as Employee[] }))
        }

        const { data: sups } = await supabase
          .from('supplies')
          .select('*')
          .eq('submission_id', id)
          .eq('tax_year', year)
        if (sups?.length) {
          setSuppliesByYear(prev => ({ ...prev, [year]: sups as Supply[] }))
        }
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Save company info
  const handleSaveInfo = async () => {
    setSaving(true)
    setSaved(false)

    await supabase
      .from('submissions')
      .update({
        company_name: companyName,
        dba_name: dbaName || null,
        contact_name: contactName,
        contact_email: contactEmail,
        fein,
        state_tax_id: stateTaxId,
        business_state: businessState,
        contact_phone: contactPhone,
        status: submission?.status === 'invited' ? 'in_progress' : submission?.status,
        started_at: submission?.started_at || new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Handle extraction after upload
  const handleExtract = useCallback(async (category: Category) => {
    const categoryFiles = files[category]
    if (!categoryFiles.length) return

    setShowExtraction(true)
    setExtractionDone(false)

    // Get document IDs for this category from DB
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('submission_id', id)
      .eq('category', category)
      .eq('extraction_status', 'pending')

    for (const doc of docs || []) {
      try {
        await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: doc.id, submission_id: id, category }),
        })
      } catch {
        // continue
      }
    }

    // Reload data
    for (const year of YEARS) {
      const { data: emps } = await supabase
        .from('employees').select('*').eq('submission_id', id).eq('tax_year', year)
      if (emps) setEmployeesByYear(prev => ({ ...prev, [year]: emps as Employee[] }))

      const { data: sups } = await supabase
        .from('supplies').select('*').eq('submission_id', id).eq('tax_year', year)
      if (sups) setSuppliesByYear(prev => ({ ...prev, [year]: sups as Supply[] }))
    }

    setExtractionDone(true)
    setTimeout(() => setShowExtraction(false), 1500)
  }, [files, id, supabase])

  // Submit on behalf
  const handleSubmit = async () => {
    await supabase
      .from('submissions')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submission_method: dataMode,
      })
      .eq('id', id)

    router.push(`/admin/submission/${id}`)
  }

  if (!submission) {
    return (
      <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, padding: 40 }}>
        Loading...
      </div>
    )
  }

  const totalQRE = YEARS.reduce((sum, year) => {
    const emps = employeesByYear[year] || []
    const sups = suppliesByYear[year] || []
    return sum
      + emps.reduce((s, e) => s + (e.qualified_amount || 0), 0)
      + sups.reduce((s, e) => s + (e.amount || 0), 0)
  }, 0)

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: 'info', label: 'Business Info', icon: '🏢' },
    { key: 'data', label: 'Data Entry', icon: '📊' },
    { key: 'review', label: 'Review & Submit', icon: '✅' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <button
            onClick={() => router.push(`/admin/submission/${id}`)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cherry)',
              fontSize: 12,
              fontWeight: 400,
              cursor: 'pointer',
              padding: 0,
              marginBottom: 8,
              display: 'block',
            }}
          >
            ← Back to submission
          </button>
          <h1
            className="font-serif"
            style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}
          >
            {submission.contact_name || 'Client'} — Workspace
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
            {submission.company_name || 'No company'} · Complete their submission from here
          </div>
        </div>
        <Tag variant={submission.status === 'invited' ? 'invited' : submission.status === 'in_progress' ? 'progress' : submission.status === 'submitted' ? 'submitted' : 'complete'}>
          {submission.status.replace('_', ' ')}
        </Tag>
      </div>

      {/* Section tabs */}
      <div
        className="flex"
        style={{
          gap: 0,
          marginBottom: 24,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: activeSection === s.key ? 'var(--charcoal)' : 'var(--white)',
              color: activeSection === s.key ? 'var(--champagne)' : 'var(--muted)',
              border: 'none',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRight: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ===== BUSINESS INFO ===== */}
      {activeSection === 'info' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          <Card>
            <div
              className="font-serif"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 20 }}
            >
              Business Information
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <FormField label="Legal Business Name">
                <input className="finput" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </FormField>
              <FormField label="DBA / Trade Name">
                <input className="finput" placeholder="Optional" value={dbaName} onChange={(e) => setDbaName(e.target.value)} />
              </FormField>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <FormField label="Contact Name">
                <input className="finput" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </FormField>
              <FormField label="Email Address">
                <input className="finput" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </FormField>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <FormField label="Federal EIN (FEIN)" hint="Found on IRS EIN letter or prior tax return">
                <input className="finput" value={fein} onChange={(e) => setFein(e.target.value)} />
              </FormField>
              <FormField label="State Tax ID">
                <input className="finput" value={stateTaxId} onChange={(e) => setStateTaxId(e.target.value)} />
              </FormField>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <FormField label="Primary State">
                <select className="finput" value={businessState} onChange={(e) => setBusinessState(e.target.value)}>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Phone">
                <input className="finput" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </FormField>
            </div>

            <div className="flex items-center" style={{ gap: 12, marginTop: 8 }}>
              <Button variant="cherry" size="sm" onClick={handleSaveInfo} disabled={saving}>
                {saving ? 'Saving...' : 'Save Business Info'}
              </Button>
              {saved && (
                <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 500 }}>Saved</span>
              )}
              <Button
                variant="dark"
                size="sm"
                onClick={() => { handleSaveInfo(); setActiveSection('data') }}
                style={{ marginLeft: 'auto' }}
              >
                Save & Continue to Data →
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ===== DATA ENTRY ===== */}
      {activeSection === 'data' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {/* Mode toggle */}
          <div className="flex" style={{ gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setDataMode('upload')}
              style={{
                padding: '10px 24px',
                borderRadius: 3,
                border: dataMode === 'upload' ? '2px solid var(--cherry)' : '1.5px solid var(--border)',
                background: dataMode === 'upload' ? 'rgba(108,22,28,0.05)' : 'var(--white)',
                color: dataMode === 'upload' ? 'var(--cherry)' : 'var(--muted)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Upload Documents
            </button>
            <button
              onClick={() => setDataMode('manual')}
              style={{
                padding: '10px 24px',
                borderRadius: 3,
                border: dataMode === 'manual' ? '2px solid var(--cherry)' : '1.5px solid var(--border)',
                background: dataMode === 'manual' ? 'rgba(108,22,28,0.05)' : 'var(--white)',
                color: dataMode === 'manual' ? 'var(--cherry)' : 'var(--muted)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Manual Entry
            </button>
          </div>

          {/* Upload mode */}
          {dataMode === 'upload' && (
            <>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {CATEGORIES.map((cat) => (
                  <UploadCategory
                    key={cat}
                    category={cat}
                    files={files[cat]}
                    onClick={() => setActiveCategory(cat)}
                  />
                ))}
              </div>

              {activeCategory && (
                <UploadModal
                  category={activeCategory}
                  isOpen
                  onClose={() => {
                    const cat = activeCategory
                    setActiveCategory(null)
                    if (files[cat].length > 0) handleExtract(cat)
                  }}
                  onFilesUploaded={(newFiles) => {
                    setFiles(prev => ({
                      ...prev,
                      [activeCategory]: [...prev[activeCategory], ...newFiles],
                    }))
                  }}
                  submissionId={id}
                />
              )}

              {showExtraction && (
                <ExtractionProgress
                  isVisible={showExtraction}
                  onComplete={() => setShowExtraction(false)}
                />
              )}

              {extractionDone && (
                <div style={{ marginTop: 16 }}>
                  <InfoBox>
                    Data extracted from uploaded documents. Review below or switch to manual entry to edit.
                  </InfoBox>
                </div>
              )}
            </>
          )}

          {/* Manual mode / extracted data review */}
          <div style={{ marginTop: dataMode === 'upload' ? 20 : 0 }}>
            {YEARS.map((year) => (
              <YearBlock
                key={year}
                year={year}
                submissionId={id}
                initialEmployees={employeesByYear[year]}
                initialSupplies={suppliesByYear[year]}
                defaultExpanded={year === 2025}
              />
            ))}
          </div>

          <div className="flex justify-end" style={{ marginTop: 20 }}>
            <Button variant="dark" size="sm" onClick={() => setActiveSection('review')}>
              Continue to Review →
            </Button>
          </div>
        </div>
      )}

      {/* ===== REVIEW & SUBMIT ===== */}
      {activeSection === 'review' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          <Card>
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}
              >
                Submission Summary
              </div>
              <div
                className="font-serif"
                style={{ fontSize: 28, fontWeight: 700, color: 'var(--cherry)' }}
              >
                {formatCurrency(totalQRE)}
                <span style={{ fontSize: 12, fontWeight: 300, color: 'var(--muted)', marginLeft: 8 }}>
                  Total QRE
                </span>
              </div>
            </div>

            {/* Company summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 16,
                padding: 20,
                background: 'var(--warm)',
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              {[
                { label: 'Company', value: companyName || '—' },
                { label: 'FEIN', value: fein || '—' },
                { label: 'State', value: businessState },
                { label: 'Contact', value: contactName || '—' },
                { label: 'Email', value: contactEmail || '—' },
                { label: 'Method', value: dataMode === 'upload' ? 'Document Upload' : 'Manual Entry' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 500 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Year breakdown */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Year', 'Employees', 'Payroll QRE', 'Supplies QRE', 'Total QRE'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 12px',
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        textAlign: 'left',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {YEARS.map((year) => {
                  const emps = employeesByYear[year] || []
                  const sups = suppliesByYear[year] || []
                  const payrollQRE = emps.reduce((s, e) => s + (e.qualified_amount || 0), 0)
                  const suppliesQRE = sups.reduce((s, e) => s + (e.amount || 0), 0)
                  const yearTotal = payrollQRE + suppliesQRE
                  if (emps.length === 0 && sups.length === 0) return null
                  return (
                    <tr key={year} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>{year}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--muted)' }}>{emps.length}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--charcoal)' }}>{formatCurrency(payrollQRE)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--charcoal)' }}>{formatCurrency(suppliesQRE)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--cherry)' }}>{formatCurrency(yearTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {submission.status === 'submitted' || submission.status === 'complete' ? (
              <InfoBox>
                This submission has already been submitted.
              </InfoBox>
            ) : (
              <div className="flex items-center" style={{ gap: 12 }}>
                <Button variant="cherry" onClick={handleSubmit}>
                  Submit on Behalf of Client
                </Button>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
                  This will mark the submission as complete
                </span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
