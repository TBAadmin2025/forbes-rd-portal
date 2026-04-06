'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import FormField from '@/components/shared/FormField'
import Tag from '@/components/shared/Tag'
import type { GuideArticle } from '@/lib/types/database.types'

const CATEGORIES = ['Getting Started', 'Clients', 'Data Entry', 'Exports', 'R&D Projects', 'Team']
const CATEGORY_ICONS: Record<string, string> = {
  'Getting Started': '🚀', 'Clients': '👥', 'Data Entry': '📊',
  'Exports': '📦', 'R&D Projects': '🔬', 'Team': '🧑‍💼',
}

export default function GuideArticlePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const supabase = createClient()

  const [article, setArticle] = useState<GuideArticle | null>(null)
  const [allArticles, setAllArticles] = useState<GuideArticle[]>([])
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsSuperAdmin(profile?.role === 'super_admin')
      }
      const [articleRes, allRes] = await Promise.all([
        fetch(`/api/guide/${slug}`),
        fetch('/api/guide'),
      ])
      if (articleRes.ok) {
        const data = await articleRes.json()
        setArticle(data)
        setTitle(data.title)
        setBody(data.body)
        setVideoUrl(data.video_url || '')
        setCategory(data.category)
        setPublished(data.published)
        if (!data.body && data.created_by) setEditing(true)
      }
      if (allRes.ok) {
        setAllArticles(await allRes.json())
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    const res = await fetch(`/api/guide/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, video_url: videoUrl, category, published }),
    })
    if (res.ok) { setArticle(await res.json()); setSaved(true); setTimeout(() => setSaved(false), 3000) }
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
    const v = !published; setPublished(v)
    await fetch(`/api/guide/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: v }) })
    setArticle(prev => prev ? { ...prev, published: v } : prev)
  }

  function getEmbedUrl(url: string): string | null {
    if (!url) return null
    if (url.includes('/embed/')) return url
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const loom = url.match(/loom\.com\/share\/([^?/]+)/)
    if (loom) return `https://www.loom.com/embed/${loom[1]}`
    const vim = url.match(/vimeo\.com\/(\d+)/)
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`
    const desc = url.match(/share\.descript\.com\/(?:view|embed)\/([^?/]+)/)
    if (desc) return `https://share.descript.com/embed/${desc[1]}`
    return null
  }

  if (loading) return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, padding: 40 }}>Loading...</div>
  if (!article) return (
    <div style={{ padding: 40 }}>
      <div style={{ fontSize: 13, color: 'var(--cherry)', marginBottom: 12 }}>Article not found.</div>
      <button onClick={() => router.push('/admin/guide')} style={{ background: 'none', border: 'none', color: 'var(--cherry)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>← Back to Guide</button>
    </div>
  )

  const embedUrl = getEmbedUrl(editing ? videoUrl : (article.video_url || ''))

  // Group sidebar articles by category
  const grouped: Record<string, GuideArticle[]> = {}
  allArticles.forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })

  // Related articles: same category, different slug
  const related = allArticles.filter(a => a.category === article.category && a.slug !== article.slug).slice(0, 3)

  // Reading time estimate
  const wordCount = article.body.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div style={{ display: 'flex', gap: 0, margin: '-32px -36px', minHeight: 'calc(100vh - 64px)' }}>

      {/* Article Sidebar */}
      <aside
        style={{
          width: 260, flexShrink: 0, background: 'var(--white)',
          borderRight: '1px solid var(--border)', padding: '32px 0',
          position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto',
        }}
      >
        {Object.entries(grouped).map(([cat, articles]) => (
          <div key={cat}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 24px', marginTop: 16, marginBottom: 8 }}>
              {cat}
            </div>
            {articles.map(a => (
              <Link
                key={a.slug}
                href={`/admin/guide/${a.slug}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 24px', fontSize: 13, fontWeight: a.slug === slug ? 500 : 400,
                  color: a.slug === slug ? 'var(--cherry)' : 'var(--muted)',
                  borderLeft: `2px solid ${a.slug === slug ? 'var(--cherry)' : 'transparent'}`,
                  background: a.slug === slug ? 'rgba(108,22,28,0.04)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
              >
                {a.title}
              </Link>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '12px 24px' }} />
          </div>
        ))}
      </aside>

      {/* Article Content */}
      <main style={{ flex: 1, maxWidth: 760, padding: '48px 56px 96px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '1px', color: 'var(--muted)', marginBottom: 28, fontWeight: 400 }}>
          <Link href="/admin/guide" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Guide</Link>
          <span style={{ color: 'var(--border)' }}>›</span>
          <Link href="/admin/guide" style={{ color: 'var(--muted)', textDecoration: 'none' }}>{editing ? category : article.category}</Link>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ color: 'var(--charcoal)', fontWeight: 500 }}>{editing ? title : article.title}</span>
        </nav>

        {/* Category pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(108,22,28,0.07)', color: 'var(--cherry)',
          fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
          padding: '4px 12px', borderRadius: 100, marginBottom: 16,
        }}>
          {CATEGORY_ICONS[editing ? category : article.category] || '📄'} {editing ? category : article.category}
        </div>

        {/* Title */}
        {editing ? (
          <input className="finput" value={title} onChange={(e) => setTitle(e.target.value)}
            style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-playfair), serif', marginBottom: 16, width: '100%', lineHeight: 1.15 }}
          />
        ) : (
          <h1 className="font-serif" style={{ fontSize: 36, fontWeight: 700, color: 'var(--charcoal)', lineHeight: 1.15, marginBottom: 16 }}>
            {article.title}
          </h1>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--muted)', paddingBottom: 28, borderBottom: '1px solid var(--border)', marginBottom: 32, fontWeight: 300 }}>
          <span>{readTime} min read</span>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
          <span>Updated {new Date(article.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
          <span>Forbes Management</span>
          {!article.published && <Tag variant="invited">Draft</Tag>}
        </div>

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
                  {deleting ? '...' : 'Delete'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Video URL edit */}
        {editing && (
          <div style={{ marginBottom: 20 }}>
            <FormField label="Video URL" hint="YouTube, Loom, Vimeo, or Descript link">
              <input className="finput" placeholder="https://share.descript.com/embed/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            </FormField>
          </div>
        )}

        {/* Video embed */}
        {embedUrl && (
          <div style={{ marginBottom: 40, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--charcoal)' }}>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: 'var(--charcoal2)' }}>
              <iframe src={embedUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'var(--charcoal)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: 'rgba(240,231,215,0.5)', fontWeight: 300 }}>Forbes Management — Guide</span>
              <span style={{ fontSize: 11, color: 'rgba(240,231,215,0.35)', letterSpacing: '0.5px' }}>{readTime} min</span>
            </div>
          </div>
        )}

        {/* Category edit */}
        {editing && (
          <div style={{ marginBottom: 20 }}>
            <FormField label="Category">
              <select className="finput" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 250 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
          </div>
        )}

        {/* Body */}
        {editing ? (
          <div style={{ marginBottom: 20 }}>
            <FormField label="Article Content" hint="ALL CAPS = section headers. • = bullets. Tip:/Important:/Note: = callout boxes. Lines starting with a number and period (1. 2. 3.) = numbered steps.">
              <textarea ref={bodyRef} className="finput" rows={25} style={{ resize: 'vertical', lineHeight: 1.8, fontSize: 14 }}
                value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your guide article here..." />
            </FormField>
          </div>
        ) : (
          <div>
            {article.body ? renderBody(article.body) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, fontStyle: 'italic' }}>
                No content yet. {isSuperAdmin ? 'Click Edit to add content.' : ''}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!editing && related.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '40px 0' }} />}

        {/* Related articles */}
        {!editing && related.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
              Related articles
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
              {related.map(a => (
                <Link key={a.slug} href={`/admin/guide/${a.slug}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 4, textDecoration: 'none', transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>{a.title}</span>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>›</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Help footer */}
        {!editing && (
          <div className="relative overflow-hidden" style={{
            background: 'var(--charcoal)', borderRadius: 6, padding: '28px 32px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div className="fm-pattern absolute inset-0 pointer-events-none" style={{ opacity: 0.1 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ivory)', marginBottom: 4 }}>
                Still have questions?
              </div>
              <div style={{ fontSize: 13, color: 'rgba(240,231,215,0.5)', fontWeight: 300 }}>
                Our team is here to help — reach out anytime.
              </div>
            </div>
            <a href="mailto:concierge@quietwealthpartners.com" style={{
              position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', background: 'var(--champagne)', color: 'var(--charcoal)',
              fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
              border: 'none', borderRadius: 3, textDecoration: 'none', flexShrink: 0,
            }}>
              Contact Support →
            </a>
          </div>
        )}
      </main>
    </div>
  )
}

// ── BODY RENDERER ──
function renderBody(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let currentParagraph: string[] = []
  let isFirstParagraph = true
  let stepBuffer: { num: string; title: string; text: string }[] = []

  const flushSteps = () => {
    if (stepBuffer.length === 0) return
    elements.push(
      <div key={`steps-${elements.length}`} style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
        {stepBuffer.map((step, si) => (
          <div key={si} style={{ display: 'flex', gap: 20, paddingBottom: 28, position: 'relative' }}>
            {si < stepBuffer.length - 1 && (
              <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: 'var(--border)' }} />
            )}
            <div style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
              background: 'var(--cherry)', color: 'var(--ivory)',
              fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2, zIndex: 1,
            }}>
              {step.num}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>{step.title}</div>
              {step.text && <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8, fontWeight: 300 }}>{step.text}</div>}
            </div>
          </div>
        ))}
      </div>
    )
    stepBuffer = []
  }

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return
    const t = currentParagraph.join('\n').trim()
    if (!t) { currentParagraph = []; return }

    flushSteps()

    const style = isFirstParagraph
      ? { fontSize: 15, color: 'var(--charcoal)', lineHeight: 1.85, fontWeight: 300 as const, marginBottom: 36 }
      : { fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.85, fontWeight: 300 as const, marginBottom: 20 }

    elements.push(
      <p key={`p-${elements.length}`} style={style}>
        {t.split('\n').map((line, i, arr) => (
          <span key={i}>{renderInline(line)}{i < arr.length - 1 && <br />}</span>
        ))}
      </p>
    )
    isFirstParagraph = false
    currentParagraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) { flushParagraph(); continue }

    // Section header: ALL CAPS (min 3 chars, has letters, no lowercase)
    if (trimmed.length >= 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed)) {
      flushParagraph(); flushSteps()
      elements.push(
        <h2 key={`h2-${i}`} className="font-serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 20, marginTop: elements.length > 0 ? 40 : 0 }}>
          {trimmed.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
        </h2>
      )
      isFirstParagraph = false
      continue
    }

    // Numbered step: "1. Title" or "1) Title"
    const stepMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/)
    if (stepMatch) {
      flushParagraph()
      // Check if next line is the step description (non-numbered, non-empty)
      let desc = ''
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim()
        if (next && !next.match(/^\d+[.)]/) && next !== next.toUpperCase() && !next.startsWith('•') && !next.startsWith('- ') && !next.startsWith('Tip:') && !next.startsWith('Important:') && !next.startsWith('Note:')) {
          desc = next
          i++ // skip next line
        }
      }
      stepBuffer.push({ num: stepMatch[1], title: stepMatch[2], text: desc })
      continue
    }

    // If we have steps buffered and hit a non-step line, flush
    if (stepBuffer.length > 0 && !trimmed.match(/^\d+[.)]/)) {
      flushSteps()
    }

    // Bullet
    if (trimmed.startsWith('•') || (trimmed.startsWith('- ') && !trimmed.startsWith('--'))) {
      flushParagraph()
      elements.push(
        <div key={`b-${i}`} style={{ display: 'flex', gap: 10, marginBottom: 8, paddingLeft: 4 }}>
          <span style={{ color: 'var(--champagne)', fontSize: 8, marginTop: 7, flexShrink: 0 }}>●</span>
          <span style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.85, fontWeight: 300 }}>{renderInline(trimmed.replace(/^[•\-]\s*/, ''))}</span>
        </div>
      )
      continue
    }

    // Tip callout
    if (trimmed.startsWith('Tip:')) {
      flushParagraph()
      elements.push(
        <div key={`tip-${i}`} style={{ background: '#fdf8f0', borderLeft: '3px solid var(--champagne)', borderRadius: '0 4px 4px 0', padding: '14px 18px', fontSize: 13, lineHeight: 1.75, color: 'var(--charcoal)', marginBottom: 24, fontWeight: 300 }}>
          <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>Tip: </strong>{trimmed.replace(/^Tip:\s*/, '')}
        </div>
      )
      continue
    }

    // Important callout
    if (trimmed.startsWith('Important:')) {
      flushParagraph()
      elements.push(
        <div key={`imp-${i}`} style={{ background: 'rgba(108,22,28,0.05)', borderLeft: '3px solid var(--cherry)', borderRadius: '0 4px 4px 0', padding: '14px 18px', fontSize: 13, lineHeight: 1.75, color: 'var(--charcoal)', marginBottom: 24, fontWeight: 300 }}>
          <strong style={{ fontWeight: 600, color: 'var(--cherry)' }}>Important: </strong>{trimmed.replace(/^Important:\s*/, '')}
        </div>
      )
      continue
    }

    // Note callout (green)
    if (trimmed.startsWith('Note:')) {
      flushParagraph()
      elements.push(
        <div key={`note-${i}`} style={{ background: 'var(--em-light)', borderLeft: '3px solid var(--emerald)', borderRadius: '0 4px 4px 0', padding: '14px 18px', fontSize: 13, lineHeight: 1.75, color: 'var(--charcoal)', marginBottom: 24, fontWeight: 300 }}>
          <strong style={{ fontWeight: 600, color: 'var(--emerald)' }}>Note: </strong>{trimmed.replace(/^Note:\s*/, '')}
        </div>
      )
      continue
    }

    currentParagraph.push(line)
  }
  flushParagraph()
  flushSteps()
  return elements
}

function renderInline(text: string): React.ReactNode[] {
  // Bold: text between ** **
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
