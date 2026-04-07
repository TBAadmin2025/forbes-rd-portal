'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils/formatting'
import type { Supply } from '@/lib/types/database.types'

type RowMode = 'draft' | 'viewing' | 'editing'

interface SupplyRowProps {
  supply: Partial<Supply> & { _localId: string }
  submissionId: string
  taxYear: number
  onSaved: (localId: string, saved: Supply) => void
  onUpdated: (id: string, data: Partial<Supply>) => void
  onDelete: (id: string | undefined, localId: string) => void
}

export default function SupplyRow({
  supply,
  submissionId,
  taxYear,
  onSaved,
  onUpdated,
  onDelete,
}: SupplyRowProps) {
  const isSaved = !!supply.id
  const [mode, setMode] = useState<RowMode>(isSaved ? 'viewing' : 'draft')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [flash, setFlash] = useState(false)

  const [description, setDescription] = useState(supply.description || '')
  const [vendor, setVendor] = useState(supply.vendor || '')
  const [projectName, setProjectName] = useState(supply.project_name || '')
  const [amount, setAmount] = useState(supply.amount ?? 0)

  const [snapshot, setSnapshot] = useState({
    description: supply.description || '',
    vendor: supply.vendor || '',
    projectName: supply.project_name || '',
    amount: supply.amount ?? 0,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const canSave = description.trim() !== '' && amount > 0

  // Draft auto-save
  useEffect(() => {
    if (mode !== 'draft') return
    if (!canSave) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
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
        const created = await res.json()
        if (created.id) {
          onSaved(supply._localId, created)
          setSnapshot({ description, vendor, projectName, amount })
          setMode('viewing')
          setFlash(true)
          setTimeout(() => setFlash(false), 600)
        }
      } catch { /* silent */ }
    }, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, description, vendor, projectName, amount])

  const handleSaveEdit = async () => {
    if (!supply.id || !canSave) return
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
      setSnapshot({ description, vendor, projectName, amount })
      setMode('viewing')
    } catch { /* silent */ }
  }

  const handleCancelEdit = () => {
    setDescription(snapshot.description)
    setVendor(snapshot.vendor)
    setProjectName(snapshot.projectName)
    setAmount(snapshot.amount)
    setMode('viewing')
  }

  const handleStartEdit = () => {
    setSnapshot({ description, vendor, projectName, amount })
    setMode('editing')
  }

  const handleConfirmDelete = async () => {
    if (supply.id) {
      try { await fetch(`/api/supplies/${supply.id}`, { method: 'DELETE' }) } catch { /* silent */ }
    }
    onDelete(supply.id, supply._localId)
    setShowDeleteModal(false)
  }

  // Styles
  const cellPad: React.CSSProperties = { padding: '6px 4px' }
  const inputStyle: React.CSSProperties = {
    border: '1.5px solid var(--border)', background: 'var(--warm)', borderRadius: 2,
    padding: '6px 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--charcoal)',
    width: '100%', outline: 'none', boxSizing: 'border-box',
  }
  const viewText: React.CSSProperties = {
    fontSize: 11, color: 'var(--charcoal)', padding: '6px 4px', whiteSpace: 'nowrap',
  }
  const viewNum: React.CSSProperties = { ...viewText, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, lineHeight: 1, padding: '2px 4px',
  }

  const rowBg = flash
    ? 'rgba(0,79,53,0.06)'
    : mode === 'editing'
      ? 'rgba(108,22,28,0.02)'
      : undefined

  // --- VIEWING ---
  if (mode === 'viewing') {
    return (
      <>
        <tr style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.4s' }}>
          <td style={viewText}>{description}</td>
          <td style={viewText}>{vendor || '—'}</td>
          <td style={viewText}>{projectName || '—'}</td>
          <td style={viewNum}>{formatCurrency(amount)}</td>
          <td style={{ ...cellPad, whiteSpace: 'nowrap', textAlign: 'right' }}>
            <button onClick={handleStartEdit} style={{ ...iconBtn, color: 'var(--muted)' }} title="Edit">
              &#9998;
            </button>
            <button onClick={() => setShowDeleteModal(true)} style={{ ...iconBtn, color: '#d0c8bc', fontSize: 18 }} title="Delete">
              &times;
            </button>
          </td>
        </tr>

        {showDeleteModal && (
          <tr>
            <td colSpan={5} style={{ padding: 0 }}>
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
              }} onClick={() => setShowDeleteModal(false)}>
                <div onClick={(e) => e.stopPropagation()} style={{
                  background: 'white', borderRadius: 4, width: 380, overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}>
                  <div style={{
                    background: 'var(--cherry)', padding: '14px 20px',
                    fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '0.5px',
                  }}>
                    Remove Expense?
                  </div>
                  <div style={{ padding: '20px', fontSize: 12, color: 'var(--charcoal)', lineHeight: 1.6 }}>
                    This will permanently remove <strong>{description}</strong> from your {taxYear} R&D data.
                  </div>
                  <div style={{
                    padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10,
                    borderTop: '1px solid var(--border)',
                  }}>
                    <button onClick={() => setShowDeleteModal(false)} style={{
                      padding: '7px 16px', border: '1.5px solid var(--border)', background: 'transparent',
                      borderRadius: 3, fontSize: 11, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={handleConfirmDelete} style={{
                      padding: '7px 16px', border: 'none', background: 'var(--cherry)',
                      borderRadius: 3, fontSize: 11, fontWeight: 600, color: 'white', cursor: 'pointer',
                    }}>Remove</button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    )
  }

  // --- DRAFT or EDITING ---
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: rowBg, transition: 'background 0.4s' }}>
      <td style={cellPad}>
        <input style={inputStyle} placeholder="Expense description" value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </td>
      <td style={cellPad}>
        <input style={inputStyle} placeholder="Vendor name" value={vendor}
          onChange={(e) => setVendor(e.target.value)} />
      </td>
      <td style={cellPad}>
        <input style={inputStyle} placeholder="R&D project" value={projectName}
          onChange={(e) => setProjectName(e.target.value)} />
      </td>
      <td style={cellPad}>
        <input style={{ ...inputStyle, textAlign: 'right' }} type="number" min={0}
          value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
      </td>
      <td style={{ ...cellPad, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {mode === 'draft' ? (
          <button onClick={() => onDelete(undefined, supply._localId)}
            style={{ background: 'none', border: 'none', color: '#d0c8bc', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
            title="Remove draft">&times;</button>
        ) : (
          <>
            <button onClick={handleSaveEdit} disabled={!canSave}
              style={{
                padding: '5px 10px', border: 'none', background: canSave ? 'var(--cherry)' : '#ccc',
                borderRadius: 3, fontSize: 10, fontWeight: 600, color: 'white', cursor: canSave ? 'pointer' : 'default',
                marginRight: 4,
              }}>Save</button>
            <button onClick={handleCancelEdit}
              style={{
                padding: '5px 10px', border: '1.5px solid var(--border)', background: 'transparent',
                borderRadius: 3, fontSize: 10, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
              }}>Cancel</button>
          </>
        )}
      </td>
    </tr>
  )
}
