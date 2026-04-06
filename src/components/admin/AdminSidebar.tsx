'use client'

import Link from 'next/link'

interface AdminSidebarProps {
  activeRoute: string
  submittedCount?: number
  onAddClient?: () => void
}

interface NavItem {
  label: string
  icon: string
  href?: string
  action?: 'addClient'
  badge?: boolean
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Pipeline', icon: '📋', href: '/admin/pipeline', badge: true },
      { label: 'All Clients', icon: '👥', href: '/admin/clients' },
      { label: 'Export Packages', icon: '📦', href: '/admin/exports' },
    ],
  },
  {
    title: 'ACTIONS',
    items: [
      { label: 'Add Client', icon: '➕', action: 'addClient' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { label: 'Settings', icon: '⚙️', href: '/admin/settings' },
    ],
  },
]

export default function AdminSidebar({
  activeRoute,
  submittedCount = 0,
  onAddClient,
}: AdminSidebarProps) {
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    fontSize: 12,
    fontWeight: 500,
    color: isActive ? 'var(--champagne)' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderLeft: `2px solid ${isActive ? 'var(--champagne)' : 'transparent'}`,
    background: isActive ? 'rgba(226,196,155,0.06)' : 'transparent',
    textDecoration: 'none',
  })

  return (
    <aside
      className="flex-shrink-0 flex flex-col"
      style={{
        width: 220,
        background: 'var(--charcoal)',
        padding: '20px 0',
      }}
    >
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.18)',
              fontWeight: 600,
              padding: '0 20px',
              margin: '14px 0 5px',
            }}
          >
            {section.title}
          </div>
          {section.items.map((item) => {
            const isActive = item.href ? activeRoute.startsWith(item.href) : false

            if (item.action === 'addClient') {
              return (
                <button
                  key={item.label}
                  onClick={onAddClient}
                  style={{
                    ...linkStyle(false),
                    width: '100%',
                    border: 'none',
                    borderLeft: '2px solid transparent',
                    background: 'transparent',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                style={linkStyle(isActive)}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && submittedCount > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--cherry)',
                      color: 'var(--ivory)',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 100,
                    }}
                  >
                    {submittedCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
