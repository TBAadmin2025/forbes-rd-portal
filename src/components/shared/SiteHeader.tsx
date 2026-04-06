interface SiteHeaderProps {
  context: 'portal' | 'admin'
  userLabel?: string
  userInitials?: string
}

const LOGO_URL = 'https://assets.cdn.filesafe.space/urR6xH3XyBfmLBzEzkKY/media/69c40c28d0b6d3d9f1a59b5a.svg'

export default function SiteHeader({ context, userLabel, userInitials }: SiteHeaderProps) {
  return (
    <header
      className="flex items-center justify-between relative overflow-hidden"
      style={{ background: 'var(--cherry)', height: 64, padding: '0 48px' }}
    >
      {/* FM pattern overlay */}
      <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }} />

      {/* Inner content */}
      <div className="relative z-[1] flex items-center justify-between w-full">
        {/* Logo block */}
        <div className="flex flex-col" style={{ gap: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_URL}
            alt="Forbes Management"
            style={{ height: 38, width: 'auto', display: 'block' }}
          />
          <div
            className="font-medium"
            style={{
              fontSize: 9,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'var(--champagne)',
              paddingLeft: 2,
            }}
          >
            {context === 'portal' ? 'R&D Tax Credit Portal' : 'Admin Dashboard'}
          </div>
        </div>

        {/* Right side */}
        {context === 'portal' ? (
          <div
            style={{
              fontSize: 10,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'rgba(240,231,215,0.55)',
            }}
          >
            Secure &amp; Confidential
          </div>
        ) : (
          <div className="flex items-center" style={{ gap: 16 }}>
            {userLabel && (
              <span
                className="font-light"
                style={{ fontSize: 12, color: 'rgba(240,231,215,0.6)' }}
              >
                {userLabel}
              </span>
            )}
            {userInitials && (
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  background: 'var(--cherry-md)',
                  border: '1.5px solid rgba(226,196,155,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--champagne)',
                }}
              >
                {userInitials}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
