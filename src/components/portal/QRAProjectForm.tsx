'use client'

import { useEffect, useRef, useState } from 'react'
import FormField from '@/components/shared/FormField'
import Button from '@/components/shared/Button'

interface Challenge {
  technical_problem: string
  why_no_existing_solution: string
  approaches_tried: string
  testing_methods: string
  iteration_count: number | null
  outcome: string
}

interface QRAProject {
  id: string
  submission_id: string
  project_name: string
  start_date: string
  end_date: string
  description: string
  business_problem: string
  technologies_used: string
  improvements: string
  measurable_outcomes: string
  challenges: Challenge[]
}

interface QRAProjectFormProps {
  submissionId: string
}

function emptyChallenge(): Challenge {
  return {
    technical_problem: '',
    why_no_existing_solution: '',
    approaches_tried: '',
    testing_methods: '',
    iteration_count: null,
    outcome: '',
  }
}

function emptyProject(submissionId: string): QRAProject {
  return {
    id: '',
    submission_id: submissionId,
    project_name: '',
    start_date: '',
    end_date: '',
    description: '',
    business_problem: '',
    technologies_used: '',
    improvements: '',
    measurable_outcomes: '',
    challenges: [],
  }
}

// Normalize API response — Supabase returns qra_challenges, we need challenges
function normalizeProject(raw: Record<string, unknown>): QRAProject {
  return {
    id: raw.id as string,
    submission_id: raw.submission_id as string,
    project_name: (raw.project_name as string) || '',
    start_date: (raw.start_date as string) || '',
    end_date: (raw.end_date as string) || '',
    description: (raw.description as string) || '',
    business_problem: (raw.business_problem as string) || '',
    technologies_used: (raw.technologies_used as string) || '',
    improvements: (raw.improvements as string) || '',
    measurable_outcomes: (raw.measurable_outcomes as string) || '',
    challenges: ((raw.qra_challenges || raw.challenges || []) as Challenge[]).map(c => ({
      technical_problem: c.technical_problem || '',
      why_no_existing_solution: c.why_no_existing_solution || '',
      approaches_tried: c.approaches_tried || '',
      testing_methods: c.testing_methods || '',
      iteration_count: c.iteration_count ?? null,
      outcome: c.outcome || '',
    })),
  }
}

export default function QRAProjectForm({ submissionId }: QRAProjectFormProps) {
  const [projects, setProjects] = useState<QRAProject[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading] = useState(true)
  // Draft project — not yet saved to DB
  const [draft, setDraft] = useState<QRAProject | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchProjects()
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  async function fetchProjects() {
    try {
      const res = await fetch(`/api/qra-projects?submission_id=${submissionId}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.map(normalizeProject))
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function triggerSave(projectId: string, data: Partial<QRAProject>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await fetch(`/api/qra-projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 2000)
  }

  function updateProject(id: string, updates: Partial<QRAProject>) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated = { ...p, ...updates }
        triggerSave(id, updated)
        return updated
      })
    )
  }

  function updateChallenge(projectId: string, challengeIndex: number, updates: Partial<Challenge>) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const challenges = p.challenges.map((c, i) =>
          i === challengeIndex ? { ...c, ...updates } : c
        )
        const updated = { ...p, challenges }
        triggerSave(projectId, updated)
        return updated
      })
    )
  }

  function addChallenge(projectId: string) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        if (p.challenges.length >= 3) return p
        const challenges = [...p.challenges, emptyChallenge()]
        const updated = { ...p, challenges }
        triggerSave(projectId, updated)
        return updated
      })
    )
  }

  function removeChallenge(projectId: string, challengeIndex: number) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const challenges = p.challenges.filter((_, i) => i !== challengeIndex)
        const updated = { ...p, challenges }
        triggerSave(projectId, updated)
        return updated
      })
    )
  }

  // Show draft form instead of creating DB record immediately
  function showDraftProject() {
    if (draft) return // already showing draft
    const d = emptyProject(submissionId)
    setDraft(d)
  }

  // Save draft to DB when they enter a name
  async function saveDraft() {
    if (!draft || !draft.project_name.trim()) return
    const res = await fetch('/api/qra-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        project_name: draft.project_name,
        description: draft.description || null,
        business_problem: draft.business_problem || null,
        technologies_used: draft.technologies_used || null,
        improvements: draft.improvements || null,
        measurable_outcomes: draft.measurable_outcomes || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
      }),
    })
    if (res.ok) {
      const newProject = await res.json()
      setProjects((prev) => [...prev, normalizeProject(newProject)])
      setExpandedIds((prev) => new Set(prev).add(newProject.id))
      setDraft(null)
    }
  }

  function cancelDraft() {
    setDraft(null)
  }

  async function deleteProject(id: string) {
    if (!window.confirm('Delete this R&D project? This cannot be undone.')) return
    const res = await fetch(`/api/qra-projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading projects...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', margin: 0 }}>
          Qualified Research Activities
        </h2>
        {saveStatus !== 'idle' && (
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: saveStatus === 'saving' ? 'var(--muted)' : 'var(--emerald)' }}>
            {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
          </span>
        )}
      </div>

      {projects.length === 0 && !draft && (
        <div
          style={{
            background: 'var(--warm)',
            borderRadius: 4,
            padding: '32px 24px',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔬</div>
          <div style={{ fontSize: 14, color: 'var(--charcoal)', fontWeight: 500, marginBottom: 4 }}>
            No R&D projects yet
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 300, lineHeight: 1.6 }}>
            Add your first project to document the research activities that qualify for the tax credit.
          </div>
        </div>
      )}

      {/* Saved projects */}
      {projects.map((project) => {
        const isExpanded = expandedIds.has(project.id)
        return (
          <div
            key={project.id}
            style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}
          >
            <div
              onClick={() => toggleExpand(project.id)}
              style={{
                background: 'var(--charcoal)', color: 'var(--ivory)', padding: '14px 20px',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none',
              }}
            >
              <span className="font-serif" style={{ fontSize: 15, fontWeight: 600 }}>
                {project.project_name || 'Untitled Project'}
              </span>
              <div className="flex items-center" style={{ gap: 12 }}>
                {project.challenges.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--champagne)', opacity: 0.6 }}>
                    {project.challenges.length} challenge{project.challenges.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ fontSize: 12, opacity: 0.6 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: 24 }}>
                {renderProjectFields(project, (updates) => updateProject(project.id, updates))}

                {/* Technical Challenges */}
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                  <h3 className="font-serif" style={{ fontSize: 16, color: 'var(--charcoal)', marginBottom: 12 }}>
                    Technical Challenges
                  </h3>

                  {project.challenges.map((challenge, ci) => (
                    <div
                      key={ci}
                      style={{ background: 'var(--warm)', borderRadius: 4, padding: 20, marginBottom: 12, marginLeft: 12, position: 'relative' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                          Challenge {ci + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChallenge(project.id, ci)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px' }}
                        >
                          ×
                        </button>
                      </div>
                      {renderChallengeFields(challenge, (updates) => updateChallenge(project.id, ci, updates))}
                    </div>
                  ))}

                  {project.challenges.length < 3 && (
                    <Button variant="ghost" size="sm" onClick={() => addChallenge(project.id)} style={{ marginLeft: 12 }}>
                      + Add Challenge
                    </Button>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => deleteProject(project.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--cherry)', padding: 0 }}
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Draft project — inline form, not yet saved */}
      {draft && (
        <div style={{ background: 'var(--white)', border: '2px dashed var(--cherry)', borderRadius: 4, marginBottom: 16, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--cherry)', marginBottom: 16 }}>
            New Project
          </div>

          <FormField label="Project Name">
            <input
              type="text"
              className="finput"
              placeholder="Give your R&D project a name"
              value={draft.project_name}
              onChange={(e) => setDraft({ ...draft, project_name: e.target.value })}
              autoFocus
            />
          </FormField>

          {renderProjectFields(draft, (updates) => setDraft({ ...draft, ...updates }))}

          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <Button variant="ghost" size="sm" onClick={cancelDraft}>
              Cancel
            </Button>
            <Button
              variant="cherry"
              size="sm"
              onClick={saveDraft}
              disabled={!draft.project_name.trim()}
            >
              Save Project
            </Button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!draft && (
        <button
          type="button"
          onClick={showDraftProject}
          style={{
            width: '100%', padding: '18px 24px', background: 'transparent',
            border: '2px dashed var(--border)', borderRadius: 4, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
            color: 'var(--cherry)', fontFamily: 'var(--font-montserrat), sans-serif', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cherry)'; e.currentTarget.style.background = 'var(--warm)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
        >
          + Add R&D Project
        </button>
      )}
    </div>
  )
}

// Shared field renderers (used for both saved projects and drafts)
function renderProjectFields(
  project: { start_date: string; end_date: string; description: string; business_problem: string; technologies_used: string; improvements: string; measurable_outcomes: string },
  onChange: (updates: Record<string, string>) => void
) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Start Date">
          <input type="date" className="finput" value={project.start_date || ''} onChange={(e) => onChange({ start_date: e.target.value })} />
        </FormField>
        <FormField label="End Date">
          <input type="date" className="finput" value={project.end_date || ''} onChange={(e) => onChange({ end_date: e.target.value })} />
        </FormField>
      </div>
      <FormField label="What did you create or improve?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={project.description || ''} onChange={(e) => onChange({ description: e.target.value })} />
      </FormField>
      <FormField label="Why was it needed / what business problem did it solve?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={project.business_problem || ''} onChange={(e) => onChange({ business_problem: e.target.value })} />
      </FormField>
      <FormField label="Technologies, tools, languages, platforms used">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={project.technologies_used || ''} onChange={(e) => onChange({ technologies_used: e.target.value })} />
      </FormField>
      <FormField label="What specifically improved?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={project.improvements || ''} onChange={(e) => onChange({ improvements: e.target.value })} />
      </FormField>
      <FormField label="Measurable outcomes with metrics">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={project.measurable_outcomes || ''} onChange={(e) => onChange({ measurable_outcomes: e.target.value })} />
      </FormField>
    </>
  )
}

function renderChallengeFields(
  challenge: Challenge,
  onChange: (updates: Partial<Challenge>) => void
) {
  return (
    <>
      <FormField label="What was the technical problem?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={challenge.technical_problem || ''} onChange={(e) => onChange({ technical_problem: e.target.value })} />
      </FormField>
      <FormField label="Why couldn't you use an existing solution?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={challenge.why_no_existing_solution || ''} onChange={(e) => onChange({ why_no_existing_solution: e.target.value })} />
      </FormField>
      <FormField label="What approaches/alternatives did you try?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={challenge.approaches_tried || ''} onChange={(e) => onChange({ approaches_tried: e.target.value })} />
      </FormField>
      <FormField label="How did you test these approaches?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={challenge.testing_methods || ''} onChange={(e) => onChange({ testing_methods: e.target.value })} />
      </FormField>
      <FormField label="How many times did you iterate/redesign?">
        <input type="number" className="finput" min={0} value={challenge.iteration_count ?? ''} onChange={(e) => onChange({ iteration_count: e.target.value === '' ? null : Number(e.target.value) })} />
      </FormField>
      <FormField label="What did you discover/learn? What was the outcome?">
        <textarea className="finput" rows={3} style={{ resize: 'vertical' }} value={challenge.outcome || ''} onChange={(e) => onChange({ outcome: e.target.value })} />
      </FormField>
    </>
  )
}
