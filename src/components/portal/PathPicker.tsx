'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/shared/Button'

export default function PathPicker() {
  const router = useRouter()

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2
          className="font-serif"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--charcoal)',
            marginBottom: 6,
          }}
        >
          How would you like to submit your R&D information?
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--muted)',
            fontWeight: 300,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Choose one option. Both collect the same information — pick whichever
          feels easier.
        </p>

        {/* Path grid */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: '1fr 1fr' }}
        >
          {/* Upload card */}
          <div
            className="path-card"
            onClick={() => router.push('/portal/upload')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') router.push('/portal/upload')
            }}
            style={{
              background: 'var(--white)',
              border: '2px solid var(--border)',
              borderRadius: 4,
              padding: '36px 28px',
              cursor: 'pointer',
              transition: 'all 0.25s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 36, marginBottom: 16, display: 'block' }}>
              📂
            </span>
            <div
              className="font-serif"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--charcoal)',
                marginBottom: 8,
              }}
            >
              Upload My Documents
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                lineHeight: 1.75,
                fontWeight: 300,
                marginBottom: 16,
              }}
            >
              Have your payroll reports, P&Ls, or expense files? Upload them and
              we extract the data automatically. You just review and confirm.
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                background: 'rgba(0,79,53,0.08)',
                color: 'var(--emerald)',
              }}
            >
              ✦ Fastest — we do the work
            </span>
            <div
              className="flex items-center justify-center"
              style={{
                marginTop: 20,
                padding: 12,
                background: 'var(--cherry)',
                color: 'var(--ivory)',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                transition: 'background 0.2s',
              }}
            >
              Upload Documents →
            </div>
          </div>

          {/* Manual card */}
          <div
            className="path-card"
            onClick={() => router.push('/portal/manual')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') router.push('/portal/manual')
            }}
            style={{
              background: 'var(--white)',
              border: '2px solid var(--border)',
              borderRadius: 4,
              padding: '36px 28px',
              cursor: 'pointer',
              transition: 'all 0.25s',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 36, marginBottom: 16, display: 'block' }}>
              ✏️
            </span>
            <div
              className="font-serif"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--charcoal)',
                marginBottom: 8,
              }}
            >
              Enter My Information
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                lineHeight: 1.75,
                fontWeight: 300,
                marginBottom: 16,
              }}
            >
              Prefer to type it in yourself? We walk you through each year —
              employees, contractors, and expenses — one at a time.
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                background: 'rgba(108,22,28,0.07)',
                color: 'var(--cherry)',
              }}
            >
              Guided form
            </span>
            <div
              className="flex items-center justify-center path-card-action-alt"
              style={{
                marginTop: 20,
                padding: 12,
                background: 'var(--charcoal)',
                color: 'var(--ivory)',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                transition: 'background 0.2s',
              }}
            >
              Enter Manually →
            </div>
          </div>
        </div>
      </div>

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
          onClick={() => router.push('/portal/company-info')}
        >
          ← Back
        </Button>
        <div />
      </div>

      {/* Hover styles for path cards */}
      <style>{`
        .path-card {
          position: relative;
        }
        .path-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--cherry);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .path-card:hover::before {
          transform: scaleX(1);
        }
        .path-card:hover {
          border-color: var(--cherry) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(108,22,28,0.1);
        }
        .path-card:hover div[style*="background: var(--cherry)"] {
          background: var(--cherry-md) !important;
        }
        .path-card:hover .path-card-action-alt {
          background: var(--cherry) !important;
        }
        @media (max-width: 600px) {
          .path-card {
            grid-column: span 1;
          }
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
