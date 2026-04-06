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

  // Edit fields
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
        // Auto-enter edit mode for new empty articles
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

  // Get video embed URL
  function getEmbedUrl(url: string): string | null {
    if (!url) return null
    // Already an embed URL (Descript, etc.)
    if (url.includes('/embed/')) return url
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([^?/]+)/)
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    // Descript
    const descMatch = url.match(/share\.descript\.com\/(?:view|embed)\/([^?/]+)/)
    if (descMatch) return `https://share.descript.com/embed/${descMatch[1]}`
    return null
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
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push('/admin/guide')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', marginBottom: 14, background: 'none', border: 'none', padding: 0 }}
      >
        ← Back to Guide
      </button>

      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input
              className="finput"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-playfair), serif', marginBottom: 8 }}
            />
          ) : (
            <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', margin: '0 0 8px' }}>
              {article.title}
            </h1>
          )}
          <div className="flex items-center" style={{ gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 300 }}>
              {article.category}
            </span>
            {!article.published && <Tag variant="invited">Draft</Tag>}
            {article.published && <Tag variant="complete">Published</Tag>}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex" style={{ gap: 8, flexShrink: 0 }}>
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
      </div>

      {/* Video */}
      {editing && (
        <div style={{ marginBottom: 20 }}>
          <FormField label="Video URL" hint="YouTube, Loom, or Vimeo link">
            <input
              className="finput"
              placeholder="https://www.youtube.com/watch?v=... or https://www.loom.com/share/..."
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
            borderRadius: 4,
            marginBottom: 24,
            background: 'var(--charcoal)',
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
          <FormField label="Article Content" hint="Use plain text. Formatting support coming soon.">
            <textarea
              ref={bodyRef}
              className="finput"
              rows={20}
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
            borderRadius: 4,
            padding: '32px 36px',
          }}
        >
          {article.body ? (
            <div style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.8, fontWeight: 300, whiteSpace: 'pre-wrap' }}>
              {article.body}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, fontStyle: 'italic' }}>
              No content yet. {isSuperAdmin ? 'Click Edit to add content.' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
