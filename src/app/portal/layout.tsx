'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SiteHeader from '@/components/shared/SiteHeader'
import ProgressRail from '@/components/shared/ProgressRail'

const STEP_ROUTES: Record<string, number> = {
  '/portal/welcome': 0,
  '/portal': 0,
  '/portal/company-info': 1,
  '/portal/data-entry': 2,
  '/portal/upload': 2,
  '/portal/manual': 2,
  '/portal/review': 3,
  '/portal/confirmation': 4,
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentStep = STEP_ROUTES[pathname] ?? 0
  const [maxStepReached, setMaxStepReached] = useState(0)

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await fetch('/api/submissions')
        if (!res.ok) return

        const sub = await res.json()
        if (!sub?.id) return

        // Derive max step from actual data
        let max = 0

        // Step 1 done if company_name exists
        if (sub.company_name) max = 1

        // Step 2 done if they have employees — check via current_step or query
        if (sub.current_step && sub.current_step >= 2) {
          max = Math.max(max, sub.current_step)
        } else if (sub.company_name) {
          // Also check if they have employee data
          const empRes = await fetch(`/api/employees?submission_id=${sub.id}`)
          if (empRes.ok) {
            const emps = await empRes.json()
            if (Array.isArray(emps) && emps.length > 0) max = Math.max(max, 2)
          }
        }

        // Step 4 if submitted
        if (sub.status === 'submitted') max = 4

        // Use whichever is higher: derived or stored
        if (sub.current_step) max = Math.max(max, sub.current_step)

        setMaxStepReached(max)
      } catch {
        // silent
      }
    }
    loadProgress()
  }, [pathname])

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--ivory)' }}>
      <SiteHeader context="portal" />
      <ProgressRail currentStep={currentStep} maxStepReached={maxStepReached} />
      <main
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '44px 28px 80px',
          width: '100%',
        }}
      >
        {children}
      </main>
    </div>
  )
}
