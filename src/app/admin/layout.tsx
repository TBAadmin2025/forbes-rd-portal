'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SiteHeader from '@/components/shared/SiteHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AddClientModal from '@/components/admin/AddClientModal'
import AddTeamMemberModal from '@/components/admin/AddTeamMemberModal'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const supabase = createClient()
  const [showAddClient, setShowAddClient] = useState(false)
  const [showAddTeamMember, setShowAddTeamMember] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('')

  // Listen for custom event from dashboard "Add Client" button
  useEffect(() => {
    const handler = () => setShowAddClient(true)
    window.addEventListener('open-add-client', handler)
    return () => window.removeEventListener('open-add-client', handler)
  }, [])

  useEffect(() => {
    async function loadData() {
      // Load user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        const name = profile?.full_name || user.user_metadata?.full_name || user.email || ''
        setUserName(name)
        const parts = name.split(' ').filter(Boolean)
        setUserInitials(
          parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase()
        )
      }

      // Load submitted count
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')

      setSubmittedCount(count || 0)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshData = async () => {
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted')

    setSubmittedCount(count || 0)

    // Notify dashboard and other pages to refresh their data
    window.dispatchEvent(new CustomEvent('refresh-admin-data'))
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--warm)' }}>
      <SiteHeader context="admin" userLabel={userName} userInitials={userInitials} />
      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          activeRoute={pathname}
          submittedCount={submittedCount}
          onAddClient={() => setShowAddClient(true)}
          onAddTeamMember={() => setShowAddTeamMember(true)}
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
      <AddTeamMemberModal
        isOpen={showAddTeamMember}
        onClose={() => setShowAddTeamMember(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}
