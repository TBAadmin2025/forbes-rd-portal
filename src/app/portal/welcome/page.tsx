'use client'

import { useState, useEffect } from 'react'
import WelcomeHero from '@/components/portal/WelcomeHero'
import { useAdminSid, portalUrl } from '@/lib/utils/use-submission-id'

const STEP_ROUTES = [
  '/portal/welcome',
  '/portal/company-info',
  '/portal/data-entry',
  '/portal/review',
  '/portal/confirmation',
]

export default function WelcomePage() {
  const [firstName, setFirstName] = useState('there')
  const [resumeRoute, setResumeRoute] = useState<string | null>(null)
  const sid = useAdminSid()

  useEffect(() => {
    async function load() {
      try {
        const url = sid ? `/api/submissions/${sid}` : '/api/submissions'
        const res = await fetch(url)
        if (!res.ok) return
        const sub = await res.json()
        if (!sub?.id) return

        if (sub.contact_name) {
          setFirstName(sub.contact_name.split(' ')[0])
        }

        const step = sub.current_step ?? 0
        if (step > 0 && step < 4) {
          setResumeRoute(portalUrl(STEP_ROUTES[step] || '/portal/company-info', sid))
        } else if (sub.status === 'submitted') {
          setResumeRoute(portalUrl('/portal/confirmation', sid))
        }
      } catch {
        // silent
      }
    }
    load()
  }, [sid])

  return <WelcomeHero firstName={firstName} resumeRoute={resumeRoute} startRoute={portalUrl('/portal/company-info', sid)} />
}
