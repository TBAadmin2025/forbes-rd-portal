'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils/formatting'
import { useToast } from '@/components/shared/Toast'
import type { Supply, QRAActivity } from '@/lib/types/database.types'
import Button from '@/components/shared/Button'

// Drawer supports two modes:
// - editing: an existing saved supply
// - new: a brand new supply (no id yet)
interface SupplyDetailDrawerProps {
  isOpen: boolean
  mode: 'edit' | 'new' | null
  supply: Supply | null            // populated in edit mode
  submissionId: string
  taxYear: number
  qraActivities: QRAActivity[]
  onClose: () => void
  onSaved: (supply: Supply) => void
  onUpdated: (id: string, data: Partial<Supply>) => void
  onDeleted: (id: string) => void
}

export default function SupplyDetailDrawer({
  isOpen,
  mode,
  supply,
  submissionId,
  taxYear,
  qraActivities,
  onClose,
  onSaved,
  onUpdated,
  onDeleted,
}: SupplyDetailDrawerProps) {
  const { confirm: confirmAction } = useToast()
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [projectName, setProjectName] = useState('')
  const [amount, setAmount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const isFirstRender = useRef(true)
  const currentSupplyKey = useRef<string | null>(null)

  // When mode/supply changes, hydrate state
  useEffect(() => {
    if (!isOpen) {
      currentSupplyKey.current = null
      return
    }
    const newKey = mode === 'new' ? 'new' : supply?.id || null
    if (newKey === currentSupplyKey.current) return

    currentSupplyKey.current = newKey
    isFirstRender.current = true
    if (mode === 'new') {
      setDescription('')
      setVendor('')
      setProjectName('')
      setAmount(0)
    } else if (supply) {
      setDescription(supply.description || '')
      setVendor(supply.vendor || '')
      setProjectName(supply.project_name || '')
      setAmount(supply.amount || 0)
    }
  }, [isOpen, mode, supply])

  const canSave = description.trim() !== '' && amount > 0

  // Auto-save on field change with 1500ms debounce (edit mode only)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (mode !== 'edit') return
    if (!supply?.id) return
    if (!canSave) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const data: Partial<Supply> = {
          description,
          vendor: vendor || null,
          project_name: projectName || null,
          amount,
        }
        await fetch(`/api/supplies/${supply.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        onUpdated(supply.id, data)
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 800)
      } catch { /* silent */ }
      setSaving(false)
    }, 1500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, vendor, projectName, amount])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Parse selected activity ids from comma-separated names
  const selectedActivityIds = qraActivities
    .filter((a) => projectName.split(',').map((s) => s.trim()).includes(a.name))
    .map((a) => a.id)

  function toggleActivity(activity: QRAActivity) {
    const names = projectName ? projectName.split(',').map((s) => s.trim()).filter(Boolean) : []
    const has = names.includes(activity.name)
    const next = has ? names.filter((n) => n !== activity.name) : [...names, activity.name]
    setProjectName(next.join(', '))
  }

  async function handleCreate() {
    if (!canSave) return
    setSaving(true)
    try {
      const res = await fetch('/api/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          tax_year: taxYear,
          description,
          vendor: vendor || null,
          project_name: projectName || null,
          amount,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        onSaved(created)
        onClose()
      }
    } catch { /* silent */ }
    setSaving(false)
  }

  async function handleDelete() {
    if (!supply?.id) return
    if (!(await confirmAction('Delete this expense? This cannot be undone.'))) return
    try {
      await fetch(`/api/supplies/${supply.id}`, { method: 'DELETE' })
      onDeleted(supply.id)
      onClose()
    } catch { /* silent */ }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17,17,17,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '92vw',
          background: 'var(--ivory)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--cherry)',
            padding: '20px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.2 }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(240,231,215,0.15)',
              border: 'none',
              color: 'var(--ivory)',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            ×
          </button>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'var(--champagne)',
                marginBottom: 6,
              }}
            >
              {taxYear} · {mode === 'new' ? 'New Expense' : 'Edit Expense'}
            </div>
            <div
              className="font-serif"
              style={{ fontSize: 22, fontWeight: 700, color: 'var(--ivory)', lineHeight: 1.2 }}
            >
              {description || 'Untitled Expense'}
            </div>
            {amount > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(240,231,215,0.65)', marginTop: 4 }}>
                {formatCurrency(amount)}
              </div>
            )}
          </div>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="finput"
              style={{ fontSize: 14 }}
              placeholder="e.g., Cloud computing, lab supplies, software licenses"
              autoFocus={mode === 'new'}
            />
          </Field>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Vendor">
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="finput"
                style={{ fontSize: 14 }}
                placeholder="Vendor name"
              />
            </Field>
            <Field label="Amount">
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14,
                    color: 'var(--muted)',
                    pointerEvents: 'none',
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="finput"
                  style={{ paddingLeft: 24, fontSize: 14 }}
                  placeholder="0"
                />
              </div>
            </Field>
          </div>

          {/* QRA Projects */}
          <div style={{ marginTop: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                R&D Projects
              </div>
              <span style={{ fontSize: 11, color: 'var(--cherry)', fontWeight: 600 }}>
                {selectedActivityIds.length} of {qraActivities.length} selected
              </span>
            </div>
            {qraActivities.length === 0 ? (
              <div
                style={{
                  background: 'var(--warm)',
                  borderRadius: 4,
                  padding: 16,
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                No activities yet. Upload the QRA PDF on the QRA Activities tab.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qraActivities.map((a) => {
                  const checked = selectedActivityIds.includes(a.id)
                  return (
                    <label
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        background: checked ? 'rgba(108,22,28,0.06)' : 'var(--white)',
                        border: checked ? '1.5px solid var(--cherry)' : '1px solid var(--border)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleActivity(a)}
                        style={{
                          marginTop: 2,
                          accentColor: 'var(--cherry)',
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--charcoal)',
                            marginBottom: a.description ? 3 : 0,
                          }}
                        >
                          {a.project_number ? `${a.project_number}. ` : ''}{a.name}
                        </div>
                        {a.description && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              fontWeight: 300,
                              lineHeight: 1.5,
                            }}
                          >
                            {a.description.length > 120
                              ? a.description.slice(0, 120) + '...'
                              : a.description}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {mode === 'edit' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--cherry)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Delete
                </button>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
                  {saving ? 'Saving...' : savedFlash ? '✓ Saved' : 'Auto-saves as you type'}
                </span>
              </div>
              <Button variant="cherry" size="sm" onClick={onClose}>
                Done ✓
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="cherry"
                size="sm"
                onClick={handleCreate}
                disabled={!canSave || saving}
              >
                {saving ? 'Saving...' : 'Add Expense'}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
