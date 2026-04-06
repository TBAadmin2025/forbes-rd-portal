'use client'

import { useEffect, useRef, useState } from 'react'
import Card from '@/components/shared/Card'
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

export default function QRAProjectForm({ submissionId }: QRAProjectFormProps) {
  const [projects, setProjects] = useState<QRAProject[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading] = useState(true)
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
        setProjects(data)
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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

  async function addProject() {
    const res = await fetch('/api/qra-projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, project_name: 'New R&D Project' }),
    })
    if (res.ok) {
      const newProject = await res.json()
      setProjects((prev) => [...prev, newProject])
      setExpandedIds((prev) => new Set(prev).add(newProject.id))
    }
  }

  async function deleteProject(id: string) {
    if (!window.confirm('Are you sure you want to delete this R&D project? This cannot be undone.')) return
    const res = await fetch(`/api/qra-projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setExpandedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
        Loading projects...
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h2 className="font-serif" style={{ fontSize: 22, color: 'var(--charcoal)', margin: 0 }}>
          Qualified Research Activities
        </h2>
        {saveStatus !== 'idle' && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: saveStatus === 'saving' ? 'var(--muted)' : 'var(--emerald)',
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
          </span>
        )}
      </div>

      {projects.map((project) => {
        const isExpanded = expandedIds.has(project.id)

        return (
          <div
            key={project.id}
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            {/* Project Header */}
            <div
              onClick={() => toggleExpand(project.id)}
              style={{
                background: 'var(--charcoal)',
                color: 'var(--ivory)',
                padding: '14px 20px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              <span
                className="font-serif"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                {project.project_name || 'Untitled Project'}
              </span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                {isExpanded ? '▲' : '▼'}
              </span>
            </div>

            {/* Project Body */}
            {isExpanded && (
              <div style={{ padding: 24 }}>
                <FormField label="Project Name">
                  <input
                    type="text"
                    className="finput"
                    value={project.project_name}
                    onChange={(e) => updateProject(project.id, { project_name: e.target.value })}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FormField label="Start Date">
                    <input
                      type="date"
                      className="finput"
                      value={project.start_date || ''}
                      onChange={(e) => updateProject(project.id, { start_date: e.target.value })}
                    />
                  </FormField>
                  <FormField label="End Date">
                    <input
                      type="date"
                      className="finput"
                      value={project.end_date || ''}
                      onChange={(e) => updateProject(project.id, { end_date: e.target.value })}
                    />
                  </FormField>
                </div>

                <FormField label="What did you create or improve?">
                  <textarea
                    className="finput"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={project.description || ''}
                    onChange={(e) => updateProject(project.id, { description: e.target.value })}
                  />
                </FormField>

                <FormField label="Why was it needed / what business problem did it solve?">
                  <textarea
                    className="finput"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={project.business_problem || ''}
                    onChange={(e) => updateProject(project.id, { business_problem: e.target.value })}
                  />
                </FormField>

                <FormField label="Technologies, tools, languages, platforms used">
                  <textarea
                    className="finput"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={project.technologies_used || ''}
                    onChange={(e) => updateProject(project.id, { technologies_used: e.target.value })}
                  />
                </FormField>

                <FormField label="What specifically improved?">
                  <textarea
                    className="finput"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={project.improvements || ''}
                    onChange={(e) => updateProject(project.id, { improvements: e.target.value })}
                  />
                </FormField>

                <FormField label="Measurable outcomes with metrics">
                  <textarea
                    className="finput"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={project.measurable_outcomes || ''}
                    onChange={(e) => updateProject(project.id, { measurable_outcomes: e.target.value })}
                  />
                </FormField>

                {/* Technical Challenges */}
                <div style={{ marginTop: 24, marginBottom: 16 }}>
                  <h3
                    className="font-serif"
                    style={{
                      fontSize: 16,
                      color: 'var(--charcoal)',
                      marginBottom: 12,
                    }}
                  >
                    Technical Challenges
                  </h3>

                  {(project.challenges || []).map((challenge, ci) => (
                    <div
                      key={ci}
                      style={{
                        background: 'var(--warm)',
                        borderRadius: 4,
                        padding: 20,
                        marginBottom: 12,
                        marginLeft: 12,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            color: 'var(--muted)',
                          }}
                        >
                          Challenge {ci + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChallenge(project.id, ci)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 18,
                            color: 'var(--muted)',
                            lineHeight: 1,
                            padding: '0 4px',
                          }}
                          title="Remove challenge"
                        >
                          ×
                        </button>
                      </div>

                      <FormField label="What was the technical problem?">
                        <textarea
                          className="finput"
                          rows={3}
                          style={{ resize: 'vertical' }}
                          value={challenge.technical_problem || ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, { technical_problem: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label="Why couldn't you use an existing solution?">
                        <textarea
                          className="finput"
                          rows={3}
                          style={{ resize: 'vertical' }}
                          value={challenge.why_no_existing_solution || ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, {
                              why_no_existing_solution: e.target.value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="What approaches/alternatives did you try?">
                        <textarea
                          className="finput"
                          rows={3}
                          style={{ resize: 'vertical' }}
                          value={challenge.approaches_tried || ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, { approaches_tried: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label="How did you test these approaches?">
                        <textarea
                          className="finput"
                          rows={3}
                          style={{ resize: 'vertical' }}
                          value={challenge.testing_methods || ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, { testing_methods: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label="How many times did you iterate/redesign?">
                        <input
                          type="number"
                          className="finput"
                          min={0}
                          value={challenge.iteration_count ?? ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, {
                              iteration_count: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      </FormField>

                      <FormField label="What did you discover/learn? What was the outcome?">
                        <textarea
                          className="finput"
                          rows={3}
                          style={{ resize: 'vertical' }}
                          value={challenge.outcome || ''}
                          onChange={(e) =>
                            updateChallenge(project.id, ci, { outcome: e.target.value })
                          }
                        />
                      </FormField>
                    </div>
                  ))}

                  {(project.challenges || []).length < 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addChallenge(project.id)}
                      style={{ marginLeft: 12 }}
                    >
                      + Add Challenge
                    </Button>
                  )}
                </div>

                {/* Delete Project */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => deleteProject(project.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: 'var(--cherry)',
                      padding: 0,
                    }}
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add R&D Project Button */}
      <button
        type="button"
        onClick={addProject}
        style={{
          width: '100%',
          padding: '18px 24px',
          background: 'transparent',
          border: '2px dashed var(--border)',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--cherry)',
          fontFamily: 'var(--font-montserrat), sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--cherry)'
          e.currentTarget.style.background = 'var(--warm)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        + Add R&D Project
      </button>
    </div>
  )
}
