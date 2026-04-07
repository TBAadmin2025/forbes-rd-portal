'use client'

import { useState, useRef, useCallback } from 'react'
import Button from '@/components/shared/Button'
import type { UploadedFile } from './UploadCategory'

type Category = 'payroll' | 'pandl' | 'taxid' | 'gross_receipts'

interface UploadModalProps {
  category: Category
  isOpen: boolean
  onClose: () => void
  onFilesUploaded: (files: UploadedFile[]) => void
  submissionId: string
  taxYears?: number[]
}

const CATEGORY_LABELS: Record<Category, { label: string; title: string }> = {
  payroll: { label: 'Payroll', title: 'Upload Payroll Reports' },
  pandl: { label: 'P&L', title: 'Upload P&L / Expense Reports' },
  taxid: { label: 'Tax ID', title: 'Upload FEIN & State Tax ID Docs' },
  gross_receipts: { label: 'Gross Receipts', title: 'Upload Gross Receipts' },
}

const ACCEPT = '.pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png'

interface LocalFile {
  name: string
  year: number | null
  file: File
  uploading: boolean
  uploaded: boolean
}

export default function UploadModal({
  category,
  isOpen,
  onClose,
  onFilesUploaded,
  submissionId,
  taxYears,
}: UploadModalProps) {
  const isTaxId = category === 'taxid'
  const sortedYears = (taxYears && taxYears.length > 0)
    ? [...taxYears].sort((a, b) => a - b)
    : [2022, 2023, 2024, 2025]
  const defaultYear = sortedYears[sortedYears.length - 1]
  const years: (number | null)[] = isTaxId ? [null] : sortedYears
  const [selectedYear, setSelectedYear] = useState<number | null>(isTaxId ? null : defaultYear)
  const [files, setFiles] = useState<LocalFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (f: File, year: number | null) => {
    const formData = new FormData()
    formData.append('file', f)
    formData.append('submission_id', submissionId)
    formData.append('category', category)
    formData.append('tax_year', year != null ? String(year) : 'current')

    await fetch('/api/documents/upload', { method: 'POST', body: formData })
  }, [submissionId, category])

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const newFiles: LocalFile[] = Array.from(incoming).map((f) => ({
      name: f.name,
      year: selectedYear,
      file: f,
      uploading: true,
      uploaded: false,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    for (const lf of newFiles) {
      await uploadFile(lf.file, lf.year)
      setFiles((prev) =>
        prev.map((pf) =>
          pf.name === lf.name && pf.year === lf.year
            ? { ...pf, uploading: false, uploaded: true }
            : pf
        )
      )
    }
  }, [selectedYear, uploadFile])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleClose = () => {
    const uploaded = files
      .filter((f) => f.uploaded)
      .map((f) => ({ name: f.name, year: f.year }))
    if (uploaded.length > 0) {
      onFilesUploaded(uploaded)
    }
    setFiles([])
    setSelectedYear(isTaxId ? null : defaultYear)
    onClose()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const yearsWithFiles = new Set(files.filter((f) => f.uploaded).map((f) => f.year))

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'rgba(17,17,17,0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 500,
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        style={{
          background: 'var(--ivory)',
          borderRadius: 6,
          width: '100%',
          maxWidth: 460,
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Cherry header */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'var(--cherry)',
            padding: '22px 28px',
            borderRadius: '6px 6px 0 0',
          }}
        >
          <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.25 }} />
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(240,231,215,0.15)',
              border: 'none',
              width: 26,
              height: 26,
              borderRadius: '50%',
              color: 'var(--ivory)',
              fontSize: 15,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            ×
          </button>
          <div className="relative z-[1]">
            <div
              className="font-serif"
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--ivory)' }}
            >
              {CATEGORY_LABELS[category].title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(240,231,215,0.55)',
                marginTop: 3,
                fontWeight: 300,
              }}
            >
              Select a year, then upload files for that year.
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Year tabs */}
          <div className="flex" style={{ gap: 6, marginBottom: 20 }}>
            {years.map((y) => {
              const isSelected = y === selectedYear
              const hasFiles = yearsWithFiles.has(y)
              return (
                <button
                  key={y ?? 'current'}
                  onClick={() => setSelectedYear(y)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isSelected
                      ? 'var(--champagne)'
                      : hasFiles
                        ? 'var(--em-light)'
                        : 'rgba(108,22,28,0.05)',
                    color: isSelected
                      ? 'var(--charcoal)'
                      : hasFiles
                        ? 'var(--emerald)'
                        : 'var(--muted)',
                  }}
                >
                  {y ?? 'Current'}
                </button>
              )
            })}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--cherry)' : 'rgba(108,22,28,0.2)'}`,
              borderRadius: 4,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 16,
              background: dragging ? 'rgba(108,22,28,0.03)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontWeight: 300,
              }}
            >
              Drag files here or{' '}
              <span style={{ color: 'var(--cherry)', fontWeight: 600, cursor: 'pointer' }}>
                click to browse
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--muted)',
                marginTop: 6,
                opacity: 0.6,
              }}
            >
              PDF, Excel, CSV, or images
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
              style={{ display: 'none' }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center"
                  style={{
                    gap: 10,
                    padding: '9px 12px',
                    background: 'var(--warm)',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                    marginBottom: 5,
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontSize: 14 }}>📄</span>
                  <span className="flex-1" style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: '1px',
                      background: f.uploaded ? 'var(--emerald)' : 'var(--champagne)',
                      color: f.uploaded ? 'var(--white)' : 'var(--charcoal)',
                      padding: '2px 7px',
                      borderRadius: 100,
                      fontWeight: 600,
                    }}
                  >
                    {f.year ?? 'Current'}
                  </span>
                  {f.uploading && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(108,22,28,0.2)',
                        borderTopColor: 'var(--cherry)',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                  )}
                  {!f.uploading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d0c8bc',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '2px 4px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 28px 22px' }}>
          <Button variant="dark" onClick={handleClose} style={{ width: '100%' }}>
            Done — Close
          </Button>
        </div>
      </div>
    </div>
  )
}
