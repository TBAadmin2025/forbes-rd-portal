'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SiteHeader from '@/components/shared/SiteHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AddClientModal from '@/components/admin/AddClientModal'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const supabase = createClient()
  const [showAddClient, setShowAddClient] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)

  useEffect(() => {
    async function loadCount() {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')

      setSubmittedCount(count || 0)
    }
    loadCount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = async () => {
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted')

    setSubmittedCount(count || 0)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--warm)' }}>
      <SiteHeader context="admin" userLabel="Jessica Forbes" userInitials="JF" />
      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          activeRoute={pathname}
          submittedCount={submittedCount}
          onAddClient={() => setShowAddClient(true)}
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: '32px 36px' }}
        >
          {children}
        </main>
      </div>

      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onSuccess={refreshData}
      />
    </div>
  )
}
