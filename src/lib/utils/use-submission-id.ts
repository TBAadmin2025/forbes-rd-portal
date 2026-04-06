'use client'

import { useMemo } from 'react'

/**
 * Returns the submission ID from ?sid= param if present (admin working on behalf).
 * Uses window.location to avoid requiring Suspense boundary for useSearchParams.
 */
export function useAdminSid(): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('sid')
  }, [])
}

/**
 * Builds a portal URL preserving the ?sid= param if present.
 */
export function portalUrl(path: string, sid: string | null): string {
  if (sid) return `${path}?sid=${sid}`
  return path
}
