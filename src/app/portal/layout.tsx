'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SiteHeader from '@/components/shared/SiteHeader'
import ProgressRail from '@/components/shared/ProgressRail'

const STEP_ROUTES: Record<string, number> = {
  '/portal/welcome': 0,
  '/portal': 0,
  '/portal/company-info': 1,
  '/portal/data-entry': 2,
  '/portal/upload': 2,
  '/portal/manual': 2,
  '/portal/projects': 3,
  '/portal/review': 4,
  '/portal/confirmation': 5,
}

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentStep = STEP_ROUTES[pathname] ?? 0
  const [maxStepReached, setMaxStepReached] = useState(0)
  const [adminMode, setAdminMode] = useState<{ clientName: string; sid: string } | null>(null)

  const sid = searchParams.get('sid')

  useEffect(() => {
    async function checkAdminMode() {
      if (!sid) {
        setAdminMode(null)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        const { data: sub } = await supabase
          .from('submissions')
          .select('contact_name, company_name')
          .eq('id', sid)
          .single()

        setAdminMode({
          clientName: sub?.contact_name || sub?.company_name || 'Client',
          sid,
        })
      }
    }
    checkAdminMode()
  }, [sid])

  useEffect(() => {
    async function loadProgress() {
      try {
        const url = sid ? `/api/submissions/${sid}` : '/api/submissions'
        const res = await fetch(url)
        if (!res.ok) return

        const sub = await res.json()
        if (!sub?.id) return

        let max = 0
        if (sub.company_name) max = 1
        if (sub.current_step && sub.current_step >= 2) {
          max = Math.max(max, sub.current_step)
        } else if (sub.company_name) {
          const empRes = await fetch(`/api/employees?submission_id=${sub.id}`)
          if (empRes.ok) {
            const emps = await empRes.json()
            if (Array.isArray(emps) && emps.length > 0) max = Math.max(max, 2)
          }
        }
        if (sub.status === 'submitted') max = 4
        if (sub.current_step) max = Math.max(max, sub.current_step)
        setMaxStepReached(max)
      } catch {
        // silent
      }
    }
    loadProgress()
  }, [pathname, sid])

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--ivory)' }}>
      <SiteHeader context={adminMode ? 'admin' : 'portal'} />

      {adminMode && (
        <div
          style={{
            background: 'var(--charcoal2)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--champagne)',
              fontWeight: 500,
            }}
          >
            Working on behalf of <strong>{adminMode.clientName}</strong>
          </div>
          <a
            href={`/admin/submission/${adminMode.sid}`}
            style={{
              fontSize: 10,
              color: 'var(--ivory)',
              fontWeight: 600,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'rgba(240,231,215,0.1)',
              padding: '5px 14px',
              borderRadius: 3,
              border: '1px solid rgba(240,231,215,0.15)',
            }}
          >
            Back to Admin
          </a>
        </div>
      )}

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

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen" style={{ background: 'var(--ivory)' }}>
          <SiteHeader context="portal" />
        </div>
      }
    >
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </Suspense>
  )
}
