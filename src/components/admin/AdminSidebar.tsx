'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AdminSidebarProps {
  activeRoute: string
  submittedCount?: number
  onAddClient?: () => void
  onAddTeamMember?: () => void
}

interface NavItem {
  label: string
  icon: string
  href?: string
  action?: 'addClient'
  badge?: boolean
  tooltip: string
}

const NAV_ITEMS: (NavItem | 'divider')[] = [
  { label: 'Dashboard', icon: '🏠', href: '/admin/dashboard', tooltip: 'Your home base. See what needs attention and take action.' },
  { label: 'All Clients', icon: '👥', href: '/admin/clients', tooltip: 'See every client you\'ve added and where they are in the process.' },
  { label: 'Send to Partner', icon: '📦', href: '/admin/exports', tooltip: 'Generate and send the R&D package to Solutions Made Simple.' },
  'divider',
  { label: 'Add Client', icon: '➕', action: 'addClient', tooltip: 'Invite a new client to fill out their R&D information.' },
  'divider',
  { label: 'Guide', icon: '📖', href: '/admin/guide', tooltip: 'Step-by-step articles on how to use the portal.' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings', tooltip: 'Manage your team members and account settings.' },
]

export default function AdminSidebar({
  activeRoute,
  submittedCount = 0,
  onAddClient,
}: AdminSidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

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
    position: 'relative' as const,
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
      {NAV_ITEMS.map((item, i) => {
        if (item === 'divider') {
          return (
            <div
              key={`divider-${i}`}
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.06)',
                margin: '8px 20px',
              }}
            />
          )
        }

        const isActive = item.href ? activeRoute.startsWith(item.href) : false

        if (item.action === 'addClient') {
          return (
            <div key={item.label} style={{ position: 'relative' }}>
              <button
                onClick={onAddClient}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
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
              {hoveredItem === item.label && (
                <Tooltip text={item.tooltip} />
              )}
            </div>
          )
        }

        return (
          <div key={item.label} style={{ position: 'relative' }}>
            <Link
              href={item.href || '#'}
              style={linkStyle(isActive)}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
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
            {hoveredItem === item.label && (
              <Tooltip text={item.tooltip} />
            )}
          </div>
        )
      })}
    </aside>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginLeft: 8,
        background: 'var(--charcoal)',
        color: 'var(--ivory)',
        borderLeft: '3px solid var(--champagne)',
        padding: '10px 14px',
        borderRadius: 3,
        fontSize: 12,
        fontWeight: 300,
        lineHeight: 1.5,
        maxWidth: 220,
        zIndex: 1000,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        animation: 'fadeUp 0.15s ease',
        whiteSpace: 'normal',
      }}
    >
      {text}
    </div>
  )
}
