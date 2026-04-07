'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/shared/Card'
import FormField from '@/components/shared/FormField'
import Button from '@/components/shared/Button'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'

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

export default function CompanyInfoPage() {
  const router = useRouter()
  const supabase = createClient()
  const sid = useAdminSid()

  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Company fields
  const [companyName, setCompanyName] = useState('')
  const [dbaName, setDbaName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [fein, setFein] = useState('')
  const [stateTaxId, setStateTaxId] = useState('')
  const [businessState, setBusinessState] = useState('Georgia')
  const [contactPhone, setContactPhone] = useState('')
  const [entityType, setEntityType] = useState('')
  const [section280c, setSection280c] = useState<boolean | null>(null)

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

  // Gross receipts + tax window (driven by submission.tax_years)
  const [grossReceipts, setGrossReceipts] = useState<Record<number, string>>({})
  const [taxYears, setTaxYears] = useState<number[]>([])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()

      const subQuery = sid
        ? supabase.from('submissions').select('*').eq('id', sid).single()
        : supabase.from('submissions').select('*').eq('client_user_id', user.id).single()
      const { data: submission } = await subQuery

      if (submission) {
        setSubmissionId(submission.id)
        setTaxYears(submission.tax_years || [])
        setCompanyName(submission.company_name || '')
        setDbaName(submission.dba_name || '')
        setContactName(submission.contact_name || profile?.full_name || '')
        setContactEmail(submission.contact_email || profile?.email || '')
        setFein(submission.fein || '')
        setStateTaxId(submission.state_tax_id || '')
        setBusinessState(submission.business_state || 'Georgia')
        setContactPhone(submission.contact_phone || '')
        setEntityType(submission.entity_type || '')
        setSection280c(submission.section_280c_election)

        // New fields
        setStreetAddress(submission.street_address || '')
        setStreetAddress2(submission.street_address_2 || '')
        setCity(submission.city || '')
        setAddressState(submission.address_state || 'Georgia')
        setZipCode(submission.zip_code || '')
        setTaxReturnAddressSame(submission.tax_return_address_same ?? true)
        setHasAdditionalOwners(submission.has_additional_owners ?? false)
        setAdditionalOwners(submission.additional_owners || '')
        setIndustry(submission.industry || '')
        setTotalEmployees(submission.total_employees?.toString() || '')
        setTotalFtEmployees(submission.total_ft_employees?.toString() || '')
        setEmployeeStates(submission.employee_states || '')
        setDateIncorporated(submission.date_incorporated || '')
        setTaxYearEnd(submission.tax_year_end || '')

        // Load gross receipts
        const { data: receipts } = await supabase
          .from('gross_receipts')
          .select('tax_year, amount')
          .eq('submission_id', submission.id)
        if (receipts) {
          const gr: Record<number, string> = {}
          receipts.forEach((r: { tax_year: number; amount: number }) => {
            gr[r.tax_year] = r.amount.toString()
          })
          setGrossReceipts(gr)
        }
      } else {
        setContactName(profile?.full_name || '')
        setContactEmail(profile?.email || '')
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    if (!submissionId) {
      router.push(portalUrl('/portal/employees', sid))
      return
    }

    setSaving(true)

    try {
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
          entity_type: entityType || null,
          section_280c_election: section280c,
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
          status: 'in_progress',
          started_at: new Date().toISOString(),
          current_step: 2,
        })
        .eq('id', submissionId)

      // Save gross receipts — 4 prior years + tax window
      const sortedYears = [...taxYears].sort((a, b) => a - b)
      const earliest = sortedYears[0] || new Date().getFullYear() - 4
      const latest = sortedYears[sortedYears.length - 1] || new Date().getFullYear() - 1
      const grYears: number[] = []
      for (let y = earliest - 4; y <= latest; y++) grYears.push(y)
      for (const yr of grYears) {
        const amount = grossReceipts[yr]
        if (amount && parseFloat(amount) > 0) {
          await supabase
            .from('gross_receipts')
            .upsert({
              submission_id: submissionId,
              tax_year: yr,
              amount: parseFloat(amount),
            }, { onConflict: 'submission_id,tax_year' })
        }
      }

      setSaving(false)
      router.push(portalUrl('/portal/employees', sid))
    } catch {
      setSaving(false)
      router.push(portalUrl('/portal/employees', sid))
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Card 1 — Contact & Identity */}
      <Card>
        <div
          className="font-serif"
          style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}
        >
          Your Business Information
        </div>
        <div
          style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginBottom: 20, lineHeight: 1.6 }}
        >
          Basic details about your company. Takes about 5 minutes.
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
          <FormField label="Business Owner / Contact Name">
            <input className="finput" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormField>
          <FormField label="Email Address">
            <input className="finput" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </FormField>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Phone">
            <input className="finput" type="tel" placeholder="(000) 000-0000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </FormField>
          <FormField label="Industry">
            <input className="finput" placeholder="e.g., Construction, Software, Manufacturing" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </FormField>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Federal EIN (FEIN)" hint="Found on your IRS EIN letter or prior tax return">
            <input className="finput" value={fein} onChange={(e) => setFein(e.target.value)} />
          </FormField>
          <FormField label="State Tax ID">
            <input className="finput" value={stateTaxId} onChange={(e) => setStateTaxId(e.target.value)} />
          </FormField>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Primary State of Operations">
            <select className="finput" value={businessState} onChange={(e) => setBusinessState(e.target.value)}>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Date Company Incorporated">
            <input className="finput" type="date" value={dateIncorporated} onChange={(e) => setDateIncorporated(e.target.value)} />
          </FormField>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Entity Type">
            <select className="finput" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">Select...</option>
              <option value="C-Corporation">C-Corporation</option>
              <option value="S-Corporation">S-Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="LLC">LLC</option>
              <option value="Sole Proprietor">Sole Proprietor</option>
            </select>
          </FormField>
          <FormField label="§280C(c)(3) Reduced Credit Election" hint="Most businesses choose Yes — preserves your full R&D expense deduction">
            <select
              className="finput"
              value={section280c === null ? '' : section280c ? 'yes' : 'no'}
              onChange={(e) => setSection280c(e.target.value === '' ? null : e.target.value === 'yes')}
            >
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </FormField>
        </div>
      </Card>

      {/* Card 2 — Address */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}
          >
            Business Address
          </div>

          <div style={{ marginBottom: 16 }}>
            <FormField label="Street Address">
              <input className="finput" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
            </FormField>
          </div>
          <div style={{ marginBottom: 16 }}>
            <FormField label="Street Address Line 2">
              <input className="finput" placeholder="Suite, Unit, Floor (optional)" value={streetAddress2} onChange={(e) => setStreetAddress2(e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr', marginBottom: 16 }}>
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

          <div style={{ marginBottom: 8 }}>
            <label className="flex items-center" style={{ gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={taxReturnAddressSame}
                onChange={(e) => setTaxReturnAddressSame(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--cherry)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400 }}>
                The address on our tax returns is the same as above
              </span>
            </label>
          </div>
        </Card>
      </div>

      {/* Card 3 — Ownership & Workforce */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}
          >
            Ownership & Workforce
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="flex items-center" style={{ gap: 10, cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={hasAdditionalOwners}
                onChange={(e) => setHasAdditionalOwners(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--cherry)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--charcoal)', fontWeight: 400 }}>
                There are additional business owners
              </span>
            </label>
            {hasAdditionalOwners && (
              <FormField label="Additional Owner Names" hint="Separate multiple names with commas">
                <input className="finput" placeholder="e.g., John Smith, Jane Doe" value={additionalOwners} onChange={(e) => setAdditionalOwners(e.target.value)} />
              </FormField>
            )}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
            <FormField label="Total Number of Employees">
              <input className="finput" type="number" placeholder="e.g., 23" value={totalEmployees} onChange={(e) => setTotalEmployees(e.target.value)} />
            </FormField>
            <FormField label="Total Full-Time Employees">
              <input className="finput" type="number" placeholder="e.g., 18" value={totalFtEmployees} onChange={(e) => setTotalFtEmployees(e.target.value)} />
            </FormField>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
            <FormField label="States Where Employees Are Located" hint="Include all in-person and remote workers">
              <input className="finput" placeholder="e.g., Georgia, Florida, Texas" value={employeeStates} onChange={(e) => setEmployeeStates(e.target.value)} />
            </FormField>
            <FormField label="Tax Year End Date">
              <input className="finput" type="date" value={taxYearEnd} onChange={(e) => setTaxYearEnd(e.target.value)} />
            </FormField>
          </div>
        </Card>
      </div>

      {/* Card 4 — Gross Receipts */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div
            className="font-serif"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}
          >
            Gross Receipts
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginBottom: 16, lineHeight: 1.6 }}>
            Total gross receipts for each year. This is used to calculate your R&D credit eligibility.
          </div>

          {(() => {
            const sorted = [...taxYears].sort((a, b) => a - b)
            const earliest = sorted[0] || new Date().getFullYear() - 4
            const latest = sorted[sorted.length - 1] || new Date().getFullYear() - 1
            const allGrYears: number[] = []
            for (let y = latest; y >= earliest - 4; y--) allGrYears.push(y)
            return (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {allGrYears.map((yr) => (
                  <FormField key={yr} label={String(yr)}>
                    <input
                      className="finput"
                      type="number"
                      placeholder="$0"
                      value={grossReceipts[yr] || ''}
                      onChange={(e) => setGrossReceipts(prev => ({ ...prev, [yr]: e.target.value }))}
                    />
                  </FormField>
                ))}
              </div>
            )
          })()}
        </Card>
      </div>

      {/* Nav row */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(portalUrl('/portal/welcome', sid))}>
          ← Back
        </Button>
        <Button variant="dark" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Continue →'}
        </Button>
      </div>
    </div>
  )
}
