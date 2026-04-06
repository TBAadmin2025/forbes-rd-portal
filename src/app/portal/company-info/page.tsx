'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/shared/Card'
import FormField from '@/components/shared/FormField'
import Button from '@/components/shared/Button'

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

  // Load existing data: profile first, then submission (submission values take priority)
  useEffect(() => {
    async function loadData() {
      console.log('company-info: loading data...')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      console.log('company-info: user =', user?.id ?? 'null')
      if (!user) return

      // Step 1: Get profile for fallback values
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()

      console.log('company-info: profile =', profile?.email ?? 'null')

      // Step 2: Get submission
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('client_user_id', user.id)
        .single()

      console.log('company-info: submission =', submission?.id ?? 'null', 'error =', subErr?.message ?? 'none')

      if (submission) {
        setSubmissionId(submission.id)
        setCompanyName(submission.company_name || '')
        setDbaName(submission.dba_name || '')
        // Submission values take priority, fall back to profile values
        setContactName(submission.contact_name || profile?.full_name || '')
        setContactEmail(submission.contact_email || profile?.email || '')
        setFein(submission.fein || '')
        setStateTaxId(submission.state_tax_id || '')
        setBusinessState(submission.business_state || 'Georgia')
        setContactPhone(submission.contact_phone || '')
      } else {
        // No submission yet — pre-fill from profile
        setContactName(profile?.full_name || '')
        setContactEmail(profile?.email || '')
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    console.log('company-info: handleSubmit called, submissionId =', submissionId)

    if (!submissionId) {
      console.log('company-info: no submissionId — cannot save')
      // Still navigate even if no submission exists
      router.push('/portal/data-entry')
      return
    }

    setSaving(true)

    try {
      // Update submission with company fields
      const { error: updateErr } = await supabase
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
          status: 'in_progress',
          started_at: new Date().toISOString(),
          current_step: 2,
        })
        .eq('id', submissionId)

      console.log('company-info: update result, error =', updateErr?.message ?? 'none')

      setSaving(false)
      router.push('/portal/data-entry')
    } catch (err) {
      console.error('company-info: submit error:', err)
      setSaving(false)
      // Navigate anyway so the user isn't stuck
      router.push('/portal/data-entry')
    }
  }

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <Card>
        <div
          className="font-serif"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 4,
          }}
        >
          Your Business Information
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            fontWeight: 300,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          Basic details about your company. Takes about 2 minutes.
        </div>

        {/* Row 1 */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Legal Business Name">
            <input
              className="finput"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </FormField>
          <FormField label="DBA / Trade Name">
            <input
              className="finput"
              placeholder="Optional"
              value={dbaName}
              onChange={(e) => setDbaName(e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 2 */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Contact Name">
            <input
              className="finput"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </FormField>
          <FormField label="Email Address">
            <input
              className="finput"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 3 */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Federal EIN (FEIN)" hint="Found on your IRS EIN letter or prior tax return">
            <input
              className="finput"
              value={fein}
              onChange={(e) => setFein(e.target.value)}
            />
          </FormField>
          <FormField label="State Tax ID">
            <input
              className="finput"
              placeholder="State tax ID number"
              value={stateTaxId}
              onChange={(e) => setStateTaxId(e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 4 */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
          <FormField label="Primary State">
            <select
              className="finput"
              value={businessState}
              onChange={(e) => setBusinessState(e.target.value)}
            >
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Phone">
            <input
              className="finput"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </FormField>
        </div>
      </Card>

      {/* Nav row */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/portal/welcome')}
        >
          ← Back
        </Button>
        <Button variant="dark" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Continue →'}
        </Button>
      </div>
    </div>
  )
}
