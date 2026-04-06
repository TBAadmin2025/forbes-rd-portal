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

type Section = 'info' | 'data' | 'discovery' | 'review'

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

  // Address
  const [streetAddress, setStreetAddress] = useState('')
  const [streetAddress2, setStreetAddress2] = useState('')
  const [city, setCity] = useState('')
  const [addressState, setAddressState] = useState('Georgia')
  const [zipCode, setZipCode] = useState('')
  const [taxReturnAddressSame, setTaxReturnAddressSame] = useState(true)

  // Ownership
  const [hasAdditionalOwners, setHasAdditionalOwners] = useState(false)
  const [additionalOwners, setAdditionalOwners] = useState('')

  // Business details
  const [industry, setIndustry] = useState('')
  const [totalEmployees, setTotalEmployees] = useState('')
  const [totalFtEmployees, setTotalFtEmployees] = useState('')
  const [employeeStates, setEmployeeStates] = useState('')
  const [dateIncorporated, setDateIncorporated] = useState('')
  const [taxYearEnd, setTaxYearEnd] = useState('')

  // Forbes-assisted
  const [fieldConsultantName, setFieldConsultantName] = useState('')
  const [fieldConsultantEmail, setFieldConsultantEmail] = useState('')
  const [sicCode, setSicCode] = useState('')
  const [filingStatus2022, setFilingStatus2022] = useState('')
  const [filingDate2022, setFilingDate2022] = useState('')
  const [filingStatus2023, setFilingStatus2023] = useState('')
  const [filingDate2023, setFilingDate2023] = useState('')
  const [filingStatus2024, setFilingStatus2024] = useState('')
  const [filingDate2024, setFilingDate2024] = useState('')
  const [filingStatus2025, setFilingStatus2025] = useState('')
  const [shortYearCredit, setShortYearCredit] = useState<boolean | null>(null)
  const [controlledGroup, setControlledGroup] = useState<boolean | null>(null)
  const [taxYearsFiledFor, setTaxYearsFiledFor] = useState('')
  const [yearStartedRevenue, setYearStartedRevenue] = useState('')
  const [yearStartedRd, setYearStartedRd] = useState('')
  const [grossRevenueOver5m, setGrossRevenueOver5m] = useState<boolean | null>(null)
  const [ownsSubstantialRights, setOwnsSubstantialRights] = useState<boolean | null>(null)
  const [activitiesUnderContract, setActivitiesUnderContract] = useState<boolean | null>(null)
  const [contractFeeStructure, setContractFeeStructure] = useState('')

  // R&D Indicators
  const [rdIndicators, setRdIndicators] = useState<Record<string, boolean | null>>({
    rd_new_processes: null,
    rd_products_designed: null,
    rd_new_materials: null,
    rd_formulas_methods: null,
    rd_software: null,
    rd_prototypes: null,
    rd_equipment: null,
    rd_lab_equipment: null,
    rd_documented_research: null,
    rd_certification_testing: null,
    rd_environmental: null,
    rd_acoustical: null,
    rd_electrical_lighting: null,
    rd_ventilation: null,
    rd_water_plumbing: null,
    rd_cybersecurity: null,
    rd_underground_infra: null,
    rd_value_engineering: null,
  })

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

      // New client-facing fields
      setStreetAddress(sub.street_address || '')
      setStreetAddress2(sub.street_address_2 || '')
      setCity(sub.city || '')
      setAddressState(sub.address_state || 'Georgia')
      setZipCode(sub.zip_code || '')
      setTaxReturnAddressSame(sub.tax_return_address_same ?? true)
      setHasAdditionalOwners(sub.has_additional_owners ?? false)
      setAdditionalOwners(sub.additional_owners || '')
      setIndustry(sub.industry || '')
      setTotalEmployees(sub.total_employees?.toString() || '')
      setTotalFtEmployees(sub.total_ft_employees?.toString() || '')
      setEmployeeStates(sub.employee_states || '')
      setDateIncorporated(sub.date_incorporated || '')
      setTaxYearEnd(sub.tax_year_end || '')

      // Forbes-assisted fields
      setFieldConsultantName(sub.field_consultant_name || '')
      setFieldConsultantEmail(sub.field_consultant_email || '')
      setSicCode(sub.sic_code || '')
      setFilingStatus2022(sub.filing_status_2022 || '')
      setFilingDate2022(sub.filing_date_2022 || '')
      setFilingStatus2023(sub.filing_status_2023 || '')
      setFilingDate2023(sub.filing_date_2023 || '')
      setFilingStatus2024(sub.filing_status_2024 || '')
      setFilingDate2024(sub.filing_date_2024 || '')
      setFilingStatus2025(sub.filing_status_2025 || '')
      setShortYearCredit(sub.short_year_credit)
      setControlledGroup(sub.controlled_group)
      setTaxYearsFiledFor(sub.tax_years_filed_for || '')
      setYearStartedRevenue(sub.year_started_revenue?.toString() || '')
      setYearStartedRd(sub.year_started_rd?.toString() || '')
      setGrossRevenueOver5m(sub.gross_revenue_over_5m)
      setOwnsSubstantialRights(sub.owns_substantial_rights)
      setActivitiesUnderContract(sub.activities_under_contract)
      setContractFeeStructure(sub.contract_fee_structure || '')

      // R&D indicators
      setRdIndicators({
        rd_new_processes: sub.rd_new_processes,
        rd_products_designed: sub.rd_products_designed,
        rd_new_materials: sub.rd_new_materials,
        rd_formulas_methods: sub.rd_formulas_methods,
        rd_software: sub.rd_software,
        rd_prototypes: sub.rd_prototypes,
        rd_equipment: sub.rd_equipment,
        rd_lab_equipment: sub.rd_lab_equipment,
        rd_documented_research: sub.rd_documented_research,
        rd_certification_testing: sub.rd_certification_testing,
        rd_environmental: sub.rd_environmental,
        rd_acoustical: sub.rd_acoustical,
        rd_electrical_lighting: sub.rd_electrical_lighting,
        rd_ventilation: sub.rd_ventilation,
        rd_water_plumbing: sub.rd_water_plumbing,
        rd_cybersecurity: sub.rd_cybersecurity,
        rd_underground_infra: sub.rd_underground_infra,
        rd_value_engineering: sub.rd_value_engineering,
      })

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
        street_address: streetAddress || null,
        street_address_2: streetAddress2 || null,
        city: city || null,
        address_state: addressState || null,
        zip_code: zipCode || null,
        tax_return_address_same: taxReturnAddressSame,
        has_additional_owners: hasAdditionalOwners,
        additional_owners: hasAdditionalOwners ? additionalOwners || null : null,
        industry: industry || null,
        total_employees: totalEmployees ? parseInt(totalEmployees) : null,
        total_ft_employees: totalFtEmployees ? parseInt(totalFtEmployees) : null,
        employee_states: employeeStates || null,
        date_incorporated: dateIncorporated || null,
        tax_year_end: taxYearEnd || null,
        status: submission?.status === 'invited' ? 'in_progress' : submission?.status,
        started_at: submission?.started_at || new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Save discovery info
  const handleSaveDiscovery = async () => {
    setSaving(true)
    setSaved(false)

    await supabase
      .from('submissions')
      .update({
        field_consultant_name: fieldConsultantName || null,
        field_consultant_email: fieldConsultantEmail || null,
        sic_code: sicCode || null,
        filing_status_2022: filingStatus2022 || null,
        filing_date_2022: filingDate2022 || null,
        filing_status_2023: filingStatus2023 || null,
        filing_date_2023: filingDate2023 || null,
        filing_status_2024: filingStatus2024 || null,
        filing_date_2024: filingDate2024 || null,
        filing_status_2025: filingStatus2025 || null,
        short_year_credit: shortYearCredit,
        controlled_group: controlledGroup,
        tax_years_filed_for: taxYearsFiledFor || null,
        year_started_revenue: yearStartedRevenue ? parseInt(yearStartedRevenue) : null,
        year_started_rd: yearStartedRd ? parseInt(yearStartedRd) : null,
        gross_revenue_over_5m: grossRevenueOver5m,
        owns_substantial_rights: ownsSubstantialRights,
        activities_under_contract: activitiesUnderContract,
        contract_fee_structure: contractFeeStructure || null,
        ...rdIndicators,
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
    { key: 'discovery', label: 'Discovery', icon: '🔍' },
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
          </Card>

          {/* Address */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 20 }}
              >
                Address
              </div>

              <div style={{ marginBottom: 16 }}>
                <FormField label="Street Address">
                  <input className="finput" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
                </FormField>
              </div>

              <div style={{ marginBottom: 16 }}>
                <FormField label="Street Address Line 2">
                  <input className="finput" placeholder="Suite, Unit, etc." value={streetAddress2} onChange={(e) => setStreetAddress2(e.target.value)} />
                </FormField>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 16 }}>
                <FormField label="City">
                  <input className="finput" value={city} onChange={(e) => setCity(e.target.value)} />
                </FormField>
                <FormField label="State">
                  <select className="finput" value={addressState} onChange={(e) => setAddressState(e.target.value)}>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Zip Code">
                  <input className="finput" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                </FormField>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--charcoal)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={taxReturnAddressSame}
                  onChange={(e) => setTaxReturnAddressSame(e.target.checked)}
                  style={{ accentColor: 'var(--cherry)' }}
                />
                Tax return address is the same as above
              </label>
            </Card>
          </div>

          {/* Ownership */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <div
                className="font-serif"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 20 }}
              >
                Ownership & Workforce
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--charcoal)', cursor: 'pointer', marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={hasAdditionalOwners}
                  onChange={(e) => setHasAdditionalOwners(e.target.checked)}
                  style={{ accentColor: 'var(--cherry)' }}
                />
                This business has additional owners
              </label>

              {hasAdditionalOwners && (
                <div style={{ marginBottom: 16 }}>
                  <FormField label="Additional Owner Names" hint="Comma-separated">
                    <input className="finput" placeholder="e.g., Jane Doe, John Smith" value={additionalOwners} onChange={(e) => setAdditionalOwners(e.target.value)} />
                  </FormField>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <FormField label="Industry">
                  <input className="finput" placeholder="e.g., Construction, Software, Manufacturing" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </FormField>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <FormField label="Total Employees">
                  <input className="finput" type="number" value={totalEmployees} onChange={(e) => setTotalEmployees(e.target.value)} />
                </FormField>
                <FormField label="Total Full-Time Employees">
                  <input className="finput" type="number" value={totalFtEmployees} onChange={(e) => setTotalFtEmployees(e.target.value)} />
                </FormField>
              </div>

              <div style={{ marginBottom: 16 }}>
                <FormField label="States Where Employees Are Located" hint="Comma-separated">
                  <input className="finput" placeholder="e.g., Georgia, Florida, Tennessee" value={employeeStates} onChange={(e) => setEmployeeStates(e.target.value)} />
                </FormField>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <FormField label="Date Incorporated">
                  <input className="finput" type="date" value={dateIncorporated} onChange={(e) => setDateIncorporated(e.target.value)} />
                </FormField>
                <FormField label="Tax Year End" hint="e.g., 12/31">
                  <input className="finput" placeholder="MM/DD" value={taxYearEnd} onChange={(e) => setTaxYearEnd(e.target.value)} />
                </FormField>
              </div>
            </Card>
          </div>

          <div className="flex items-center" style={{ gap: 12, marginTop: 20 }}>
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
            <Button variant="dark" size="sm" onClick={() => setActiveSection('discovery')}>
              Continue to Discovery →
            </Button>
          </div>
        </div>
      )}

      {/* ===== DISCOVERY ===== */}
      {activeSection === 'discovery' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {/* Consultant Info */}
          <Card>
            <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}>
              Field Consultant
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
              <FormField label="Consultant Name">
                <input className="finput" value={fieldConsultantName} onChange={(e) => setFieldConsultantName(e.target.value)} />
              </FormField>
              <FormField label="Consultant Email">
                <input className="finput" type="email" value={fieldConsultantEmail} onChange={(e) => setFieldConsultantEmail(e.target.value)} />
              </FormField>
            </div>
            <FormField label="SIC Code">
              <input className="finput" value={sicCode} onChange={(e) => setSicCode(e.target.value)} style={{ maxWidth: 200 }} />
            </FormField>
          </Card>

          {/* Filing Status */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}>
                Tax Filing Information
              </div>
              {/* For each year 2022-2024, show filing status dropdown and date filed */}
              {[
                { year: '2022', status: filingStatus2022, setStatus: setFilingStatus2022, date: filingDate2022, setDate: setFilingDate2022 },
                { year: '2023', status: filingStatus2023, setStatus: setFilingStatus2023, date: filingDate2023, setDate: setFilingDate2023 },
                { year: '2024', status: filingStatus2024, setStatus: setFilingStatus2024, date: filingDate2024, setDate: setFilingDate2024 },
              ].map(({ year, status, setStatus, date, setDate }) => (
                <div key={year} className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                  <FormField label={`${year} Filing Status`}>
                    <select className="finput" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="filed">Filed</option>
                      <option value="extended">Extended</option>
                      <option value="not_filed">Not Filed</option>
                      <option value="amended">Amended</option>
                    </select>
                  </FormField>
                  <FormField label={`Date Filed ${year} Original Return`}>
                    <input className="finput" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </FormField>
                </div>
              ))}
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <FormField label="2025 Filing Status">
                  <select className="finput" value={filingStatus2025} onChange={(e) => setFilingStatus2025(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="filed">Filed</option>
                    <option value="extended">Extended</option>
                    <option value="not_filed">Not Filed</option>
                    <option value="amended">Amended</option>
                  </select>
                </FormField>
                <FormField label="Tax Years Being Filed For">
                  <input className="finput" placeholder="e.g., 2022, 2023, 2024" value={taxYearsFiledFor} onChange={(e) => setTaxYearsFiledFor(e.target.value)} />
                </FormField>
              </div>

              {/* Yes/No toggles for tax questions */}
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Computing a credit for a short year?', value: shortYearCredit, set: setShortYearCredit },
                  { label: 'Part of a controlled group?', value: controlledGroup, set: setControlledGroup },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400 }}>{label}</span>
                    <select
                      className="finput"
                      style={{ width: 100 }}
                      value={value === null ? '' : value ? 'yes' : 'no'}
                      onChange={(e) => set(e.target.value === '' ? null : e.target.value === 'yes')}
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Credit Method Eligibility */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}>
                Credit Method Eligibility
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
                <FormField label="Year Company Started Making Revenue" hint="e.g., 2005">
                  <input className="finput" type="number" value={yearStartedRevenue} onChange={(e) => setYearStartedRevenue(e.target.value)} />
                </FormField>
                <FormField label="Year Started R&D Efforts" hint="e.g., 2005">
                  <input className="finput" type="number" value={yearStartedRd} onChange={(e) => setYearStartedRd(e.target.value)} />
                </FormField>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Gross revenue exceed $5 Million in 2024?', value: grossRevenueOver5m, set: setGrossRevenueOver5m },
                  { label: 'Owns substantial rights to R&D results?', value: ownsSubstantialRights, set: setOwnsSubstantialRights },
                  { label: 'Any R&D activities under contract for outside party?', value: activitiesUnderContract, set: setActivitiesUnderContract },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400 }}>{label}</span>
                    <select
                      className="finput"
                      style={{ width: 100 }}
                      value={value === null ? '' : value ? 'yes' : 'no'}
                      onChange={(e) => set(e.target.value === '' ? null : e.target.value === 'yes')}
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                ))}
              </div>
              {activitiesUnderContract && (
                <div style={{ marginTop: 16 }}>
                  <FormField label="Typical Fee Structure for Contracts" hint="e.g., Lump Sum, Fixed Fee, Hourly, Material based">
                    <input className="finput" value={contractFeeStructure} onChange={(e) => setContractFeeStructure(e.target.value)} />
                  </FormField>
                </div>
              )}
            </Card>
          </div>

          {/* R&D Project Indicators */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                R&D Project Indicators
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
                Select Yes or No for each activity that applies to this client.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { key: 'rd_new_processes', label: 'Researched, developed, streamlined, or implemented any new processes' },
                  { key: 'rd_products_designed', label: 'Products designed, developed, or improved' },
                  { key: 'rd_new_materials', label: 'Tested new materials or concepts' },
                  { key: 'rd_formulas_methods', label: 'Developed or improved formulas or manufacturing methods' },
                  { key: 'rd_software', label: 'Developed, customized, improved, or updated software technology' },
                  { key: 'rd_prototypes', label: 'Developed, designed, or improved prototypes or models' },
                  { key: 'rd_equipment', label: 'Developed, designed, or improved equipment for material handling or new tasks' },
                  { key: 'rd_lab_equipment', label: 'Maintained or improved laboratory equipment' },
                  { key: 'rd_documented_research', label: 'Documented research activities' },
                  { key: 'rd_certification_testing', label: 'Completed certification testing' },
                  { key: 'rd_environmental', label: 'Completed environmental upgrades' },
                  { key: 'rd_acoustical', label: 'Developed or improved acoustical qualities' },
                  { key: 'rd_electrical_lighting', label: 'Developed or improved alternative electricity or lighting systems' },
                  { key: 'rd_ventilation', label: 'Developed or improved ventilation systems' },
                  { key: 'rd_water_plumbing', label: 'Developed or improved water/plumbing systems' },
                  { key: 'rd_cybersecurity', label: 'Developed systems for cybersecurity or to combat terrorism/criminal activities' },
                  { key: 'rd_underground_infra', label: 'Developed or improved electrical underground infrastructure' },
                  { key: 'rd_value_engineering', label: 'Developed or improved value engineering, construction, or landscaping methods' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400, flex: 1, paddingRight: 16 }}>{label}</span>
                    <select
                      className="finput"
                      style={{ width: 100, flexShrink: 0 }}
                      value={rdIndicators[key] === null || rdIndicators[key] === undefined ? '' : rdIndicators[key] ? 'yes' : 'no'}
                      onChange={(e) => setRdIndicators(prev => ({ ...prev, [key]: e.target.value === '' ? null : e.target.value === 'yes' }))}
                    >
                      <option value="">—</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Save */}
          <div className="flex items-center" style={{ gap: 12, marginTop: 20 }}>
            <Button variant="cherry" onClick={handleSaveDiscovery} disabled={saving}>
              {saving ? 'Saving...' : 'Save Discovery Info'}
            </Button>
            {saved && (
              <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 500 }}>Saved</span>
            )}
            <Button
              variant="dark"
              size="sm"
              onClick={() => { handleSaveDiscovery(); setActiveSection('review') }}
              style={{ marginLeft: 'auto' }}
            >
              Save & Continue to Review →
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
