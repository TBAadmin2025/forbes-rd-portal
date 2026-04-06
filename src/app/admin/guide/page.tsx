'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/shared/Button'
import Tag from '@/components/shared/Tag'
import type { GuideArticle } from '@/lib/types/database.types'

const CATEGORIES = ['Getting Started', 'Clients', 'Data Entry', 'Exports', 'R&D Projects', 'Team']

const CATEGORY_ICONS: Record<string, string> = {
  'Getting Started': '🚀',
  'Clients': '👥',
  'Data Entry': '📊',
  'Exports': '📦',
  'R&D Projects': '🔬',
  'Team': '🧑‍💼',
}

export default function GuidePage() {
  const router = useRouter()
  const supabase = createClient()
  const [articles, setArticles] = useState<GuideArticle[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Getting Started')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsSuperAdmin(profile?.role === 'super_admin')
      }

      const res = await fetch('/api/guide')
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')

    const res = await fetch('/api/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        slug,
        category: newCategory,
        published: false,
      }),
    })

    if (res.ok) {
      const article = await res.json()
      router.push(`/admin/guide/${article.slug}`)
    }
  }

  // Filter by search
  const filtered = search
    ? articles.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.body.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase())
      )
    : articles

  // Group by category
  const grouped: Record<string, GuideArticle[]> = {}
  filtered.forEach((a) => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })

  if (loading) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300, padding: 40 }}>Loading articles...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
            Guide
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, marginTop: 4 }}>
            Learn how to use the portal — step by step.
          </div>
        </div>
        {isSuperAdmin && (
          <Button variant="cherry" size="sm" onClick={() => setCreating(true)}>
            + New Article
          </Button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          className="finput"
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400, fontSize: 13 }}
        />
      </div>

      {/* Create new article */}
      {creating && (
        <div
          style={{
            background: 'var(--white)',
            border: '2px dashed var(--cherry)',
            borderRadius: 4,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--cherry)', marginBottom: 16 }}>
            New Article
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Title
              </label>
              <input
                className="finput"
                placeholder="e.g., How to add a new client"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Category
              </label>
              <select className="finput" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex" style={{ gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewTitle('') }}>
              Cancel
            </Button>
            <Button variant="cherry" size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
              Create & Edit
            </Button>
          </div>
        </div>
      )}

      {/* Search no results */}
      {search && filtered.length === 0 && articles.length > 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
          No articles match &quot;{search}&quot;
        </div>
      )}

      {/* Empty state */}
      {articles.length === 0 && !creating && (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 60,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
          <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
            No articles yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 300 }}>
            {isSuperAdmin
              ? 'Create your first guide article to help the team get started.'
              : 'Guide articles will appear here once they\'re published.'}
          </div>
        </div>
      )}

      {/* Articles grouped by category */}
      {Object.entries(grouped).map(([category, catArticles]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[category] || '📄'}</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {category}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--champagne)', opacity: 0.4 }} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {catArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => router.push(`/admin/guide/${article.slug}`)}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '20px 24px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
                onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              >
                <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
                  <div className="font-serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', flex: 1 }}>
                    {article.title}
                  </div>
                  {article.video_url && <span style={{ fontSize: 14 }}>🎥</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.6 }}>
                  {article.body.slice(0, 100)}{article.body.length > 100 ? '...' : ''}
                </div>
                {isSuperAdmin && !article.published && (
                  <div style={{ marginTop: 8 }}>
                    <Tag variant="invited">Draft</Tag>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
