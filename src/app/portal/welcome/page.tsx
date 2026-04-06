'use client'

import { useState, useEffect } from 'react'
import WelcomeHero from '@/components/portal/WelcomeHero'

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/submissions')
        if (!res.ok) return
        const sub = await res.json()
        if (!sub?.id) return

        if (sub.contact_name) {
          setFirstName(sub.contact_name.split(' ')[0])
        }

        // If they have progress, show resume
        const step = sub.current_step ?? 0
        if (step > 0 && step < 4) {
          setResumeRoute(STEP_ROUTES[step] || '/portal/company-info')
        } else if (sub.status === 'submitted') {
          setResumeRoute('/portal/confirmation')
        }
      } catch {
        // silent
      }
    }
    load()
  }, [])

  return <WelcomeHero firstName={firstName} resumeRoute={resumeRoute} />
}
