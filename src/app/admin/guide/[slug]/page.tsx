'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'
import Tag from '@/components/shared/Tag'
import type { GuideArticle } from '@/lib/types/database.types'

export default function GuideArticlePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const supabase = createClient()

  const [article, setArticle] = useState<GuideArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [category, setCategory] = useState('Getting Started')
  const [published, setPublished] = useState(false)

  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const CATEGORIES = ['Getting Started', 'Clients', 'Data Entry', 'Exports', 'R&D Projects', 'Team']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsSuperAdmin(profile?.role === 'super_admin')
      }
      const res = await fetch(`/api/guide/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setArticle(data)
        setTitle(data.title)
        setBody(data.body)
        setVideoUrl(data.video_url || '')
        setCategory(data.category)
        setPublished(data.published)
        if (!data.body && data.created_by) setEditing(true)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const res = await fetch(`/api/guide/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, video_url: videoUrl, category, published }),
    })
    if (res.ok) {
      const updated = await res.json()
      setArticle(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this article? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/guide/${slug}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin/guide')
    setDeleting(false)
  }

  const handlePublishToggle = async () => {
    const newPublished = !published
    setPublished(newPublished)
    await fetch(`/api/guide/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: newPublished }),
    })
    setArticle(prev => prev ? { ...prev, published: newPublished } : prev)
  }

  function getEmbedUrl(url: string): string | null {
    if (!url) return null
    if (url.includes('/embed/')) return url
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    const loomMatch = url.match(/loom\.com\/share\/([^?/]+)/)
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    const descMatch = url.match(/share\.descript\.com\/(?:view|embed)\/([^?/]+)/)
    if (descMatch) return `https://share.descript.com/embed/${descMatch[1]}`
    return null
  }

  // Parse body into sections: lines starting with all caps = section headers
  function renderBody(text: string) {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentParagraph: string[] = []

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join('\n').trim()
        if (text) {
          elements.push(
            <p key={`p-${elements.length}`} style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.9, fontWeight: 300, margin: '0 0 16px' }}>
              {text.split('\n').map((line, i) => (
                <span key={i}>
                  {renderInlineFormatting(line)}
                  {i < text.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
          )
        }
        currentParagraph = []
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Empty line = paragraph break
      if (!trimmed) {
        flushParagraph()
        continue
      }

      // Section header: ALL CAPS line (at least 3 chars, no lowercase)
      if (trimmed.length >= 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed)) {
        flushParagraph()
        elements.push(
          <div key={`h-${i}`} style={{ marginTop: elements.length > 0 ? 32 : 0, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  textTransform: 'uppercase',
                  color: 'var(--cherry)',
                  margin: 0,
                }}
              >
                {trimmed}
              </h3>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          </div>
        )
        continue
      }

      // Bullet point: starts with • or -
      if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
        flushParagraph()
        const bulletText = trimmed.replace(/^[•\-]\s*/, '')
        elements.push(
          <div key={`b-${i}`} className="flex" style={{ gap: 10, marginBottom: 8, paddingLeft: 4 }}>
            <span style={{ color: 'var(--champagne)', fontSize: 8, marginTop: 6, flexShrink: 0 }}>●</span>
            <span style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.8, fontWeight: 300 }}>
              {renderInlineFormatting(bulletText)}
            </span>
          </div>
        )
        continue
      }

      // Tip/Important callout
      if (trimmed.startsWith('Tip:') || trimmed.startsWith('Important:')) {
        flushParagraph()
        const isImportant = trimmed.startsWith('Important:')
        elements.push(
          <div
            key={`tip-${i}`}
            style={{
              background: isImportant ? 'rgba(108,22,28,0.04)' : 'rgba(226,196,155,0.15)',
              borderLeft: `3px solid ${isImportant ? 'var(--cherry)' : 'var(--champagne)'}`,
              borderRadius: '0 4px 4px 0',
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--charcoal)',
              fontWeight: 300,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ fontWeight: 600, color: isImportant ? 'var(--cherry)' : 'var(--charcoal)' }}>
              {isImportant ? 'Important: ' : 'Tip: '}
            </strong>
            {trimmed.replace(/^(Tip|Important):\s*/, '')}
          </div>
        )
        continue
      }

      currentParagraph.push(line)
    }
    flushParagraph()
    return elements
  }

  function renderInlineFormatting(text: string): React.ReactNode[] {
    // Handle bold text wrapped in double quotes for emphasis
    const parts = text.split(/(".*?")/g)
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return <strong key={i} style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{part}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, padding: 40 }}>Loading...</div>
  }

  if (!article) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ fontSize: 13, color: 'var(--cherry)', marginBottom: 12 }}>Article not found.</div>
        <button onClick={() => router.push('/admin/guide')} style={{ background: 'none', border: 'none', color: 'var(--cherry)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
          ← Back to Guide
        </button>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(editing ? videoUrl : (article.video_url || ''))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/guide')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', marginBottom: 20, background: 'none', border: 'none', padding: 0 }}
      >
        ← Back to Guide
      </button>

      {/* Category + status */}
      <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--champagne)' }}>
          {editing ? category : article.category}
        </span>
        {!article.published && <Tag variant="invited">Draft</Tag>}
        {article.published && <Tag variant="complete">Published</Tag>}
      </div>

      {/* Title */}
      {editing ? (
        <input
          className="finput"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-playfair), serif', marginBottom: 16, width: '100%' }}
        />
      ) : (
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 8px', lineHeight: 1.2 }}>
          {article.title}
        </h1>
      )}

      {/* Admin actions */}
      {isSuperAdmin && (
        <div className="flex" style={{ gap: 8, marginBottom: 24 }}>
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="cherry" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant={published ? 'ghost' : 'emerald'} size="sm" onClick={handlePublishToggle}>
                {published ? 'Unpublish' : 'Publish'}
              </Button>
              <Button variant="champagne" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

      {/* Video */}
      {editing && (
        <div style={{ marginBottom: 20 }}>
          <FormField label="Video URL" hint="YouTube, Loom, Vimeo, or Descript link">
            <input
              className="finput"
              placeholder="https://share.descript.com/embed/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </FormField>
        </div>
      )}

      {embedUrl && (
        <div
          style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: 6,
            marginBottom: 32,
            background: 'var(--charcoal)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            maxWidth: 560,
          }}
        >
          <iframe
            src={embedUrl}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Category selector (edit mode) */}
      {editing && (
        <div style={{ marginBottom: 20 }}>
          <FormField label="Category">
            <select className="finput" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 250 }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
        </div>
      )}

      {/* Body */}
      {editing ? (
        <div style={{ marginBottom: 20 }}>
          <FormField label="Article Content" hint="ALL CAPS lines become section headers. Lines starting with • become bullet points. Lines starting with Tip: or Important: become callout boxes.">
            <textarea
              ref={bodyRef}
              className="finput"
              rows={25}
              style={{ resize: 'vertical', lineHeight: 1.8, fontSize: 14 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your guide article here..."
            />
          </FormField>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '36px 40px',
          }}
        >
          {article.body ? (
            renderBody(article.body)
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, fontStyle: 'italic' }}>
              No content yet. {isSuperAdmin ? 'Click Edit to add content.' : ''}
            </div>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/admin/guide')}
          style={{ background: 'none', border: 'none', color: 'var(--cherry)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
        >
          ← Back to all articles
        </button>
      </div>
    </div>
  )
}
