'use client'

export interface UploadedFile {
  name: string
  year: number | null
}

type Category = 'payroll' | 'pandl' | 'taxid' | 'gross_receipts' | 'qre_spreadsheet'

interface UploadCategoryProps {
  category: Category
  files: UploadedFile[]
  onClick: () => void
  taxYears?: number[]
}

const CATEGORY_META: Record<Category, { icon: string; title: string; desc: string; optional?: boolean }> = {
  payroll: {
    icon: '📊',
    title: 'Payroll Reports',
    desc: 'W2 and 1099 data for all R&D employees and contractors',
  },
  pandl: {
    icon: '📈',
    title: 'P&L / Expense Reports',
    desc: 'Profit & Loss statements or detailed expense reports',
  },
  taxid: {
    icon: '🏛️',
    title: 'FEIN & State Tax ID Docs',
    desc: 'IRS EIN confirmation letter and state registration',
  },
  gross_receipts: {
    icon: '💰',
    title: 'Gross Receipts',
    desc: 'Only needed if not already in your P&L uploads',
    optional: true,
  },
  qre_spreadsheet: {
    icon: '📑',
    title: 'QRE Spreadsheet (Legacy)',
    desc: 'Pre-portal QRE workbook — substitutes for in-portal employee data per year',
  },
}

export default function UploadCategory({ category, files, onClick, taxYears }: UploadCategoryProps) {
  const baseMeta = CATEGORY_META[category]
  const yearLabel = category === 'taxid'
    ? 'Current documents'
    : (taxYears && taxYears.length > 0
        ? [...taxYears].sort((a, b) => a - b).join(' · ')
        : '')
  const meta = { ...baseMeta, years: yearLabel }
  const hasFiles = files.length > 0

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick() }}
      className={`upload-cat${hasFiles ? ' done' : ''}`}
      style={{
        background: hasFiles ? 'var(--em-light)' : 'var(--white)',
        border: hasFiles
          ? '2px solid var(--emerald)'
          : '2px dashed rgba(108,22,28,0.2)',
        borderRadius: 4,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Count badge */}
      {hasFiles && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--emerald)',
            color: 'var(--white)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {files.length}
        </div>
      )}

      <div style={{ fontSize: 28, marginBottom: 10 }}>{meta.icon}</div>
      <div
        className="font-serif"
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--charcoal)',
          marginBottom: 5,
        }}
      >
        {meta.title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          lineHeight: 1.6,
          fontWeight: 300,
        }}
      >
        {meta.desc}
      </div>

      {hasFiles ? (
        <div
          style={{
            fontSize: 11,
            color: 'var(--emerald)',
            fontWeight: 600,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          ✓ {files.length} file{files.length !== 1 ? 's' : ''} uploaded
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '1.5px',
              color: 'var(--champagne)',
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            {meta.years}
          </div>
          {meta.optional && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 6,
                fontSize: 9,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--muted)',
                background: 'var(--ivory-dk)',
                padding: '2px 8px',
                borderRadius: 100,
              }}
            >
              Only if not in P&L
            </span>
          )}
        </>
      )}

      <style>{`
        .upload-cat:hover {
          border-color: var(--cherry) !important;
          border-style: solid !important;
          background: #fdf5ed !important;
          transform: translateY(-2px);
        }
        .upload-cat.done:hover {
          border-color: var(--emerald) !important;
          background: var(--em-light) !important;
        }
      `}</style>
    </div>
  )
}
