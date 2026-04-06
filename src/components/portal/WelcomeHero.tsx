import Link from 'next/link'
import Button from '@/components/shared/Button'

interface WelcomeHeroProps {
  firstName: string
  resumeRoute?: string | null
  startRoute?: string
}

const STEPS = [
  { num: '01', label: 'Business info' },
  { num: '02', label: 'Upload or enter data' },
  { num: '03', label: 'Review & submit' },
]

export default function WelcomeHero({ firstName, resumeRoute, startRoute = '/portal/company-info' }: WelcomeHeroProps) {
  return (
    <>
      <div
        className="relative overflow-hidden"
        style={{
          background: 'var(--cherry)',
          borderRadius: 6,
          padding: '52px 48px',
          marginBottom: 24,
        }}
      >
        {/* FM pattern overlay */}
        <div
          className="fm-pattern absolute inset-0 pointer-events-none"
          style={{ opacity: 0.3 }}
        />

        <div className="relative z-[1]">
          {/* Eyebrow */}
          <div
            className="flex items-center"
            style={{
              fontSize: 10,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              color: 'var(--champagne)',
              marginBottom: 16,
              fontWeight: 500,
              gap: 10,
            }}
          >
            <span
              style={{
                width: 20,
                height: 1,
                background: 'var(--champagne)',
                display: 'inline-block',
              }}
            />
            Forbes Management · R&D Tax Credit
          </div>

          {/* Heading */}
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 700,
              color: 'var(--ivory)',
              lineHeight: 1.1,
              marginBottom: 14,
            }}
          >
            {resumeRoute ? (
              <>
                Welcome back,{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--champagne)' }}>
                  {firstName}.
                </em>
              </>
            ) : (
              <>
                Hello,{' '}
                <em style={{ fontStyle: 'italic', color: 'var(--champagne)' }}>
                  {firstName}.
                </em>
                <br />
                Let&rsquo;s get your filing started.
              </>
            )}
          </h1>

          {/* Body */}
          <p
            style={{
              fontSize: 14,
              color: 'rgba(240,231,215,0.62)',
              fontWeight: 300,
              lineHeight: 1.85,
              maxWidth: 480,
              marginBottom: 28,
            }}
          >
            Forbes Management has invited you to complete your R&D tax credit
            submission. It takes about 15 minutes and you can save your progress
            and come back anytime.
          </p>

          {/* 3-step strip */}
          <div
            className="flex"
            style={{
              maxWidth: 520,
              marginBottom: 32,
              border: '1px solid rgba(240,231,215,0.12)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className="flex-1 text-center"
                style={{
                  padding: '16px 12px',
                  background: 'rgba(240,231,215,0.05)',
                  borderRight:
                    i < STEPS.length - 1
                      ? '1px solid rgba(240,231,215,0.1)'
                      : 'none',
                }}
              >
                <div
                  className="font-serif"
                  style={{
                    fontSize: 26,
                    color: 'var(--champagne)',
                    fontWeight: 700,
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(240,231,215,0.45)',
                    marginTop: 4,
                    letterSpacing: '1px',
                  }}
                >
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          {resumeRoute ? (
            <div className="flex" style={{ gap: 12 }}>
              <Link href={resumeRoute}>
                <Button variant="champagne" size="lg">
                  Continue where you left off →
                </Button>
              </Link>
              <Link href={startRoute}>
                <Button variant="ghost-light" size="lg">
                  Start over
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/portal/company-info">
              <Button variant="champagne" size="lg">
                Get Started →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Contact line */}
      <div
        className="text-center"
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          padding: '12px 0',
          fontWeight: 300,
        }}
      >
        Questions?{' '}
        <strong style={{ color: 'var(--cherry)', fontWeight: 600 }}>
          admin@forbesmgt.com
        </strong>
      </div>
    </>
  )
}
