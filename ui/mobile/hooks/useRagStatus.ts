import { useCallback, useEffect, useState } from 'react'
import { useSupabase } from '@ui/mobile/providers/SupabaseProvider'

export interface RagStatus {
  chunkCount: number
  indexedAt: string | null
  isLoading: boolean
  /** Call after an index/delete operation to immediately re-fetch instead of waiting for the next poll tick. */
  refresh: () => void
}

const POLL_INTERVAL_MS = 3000
type RagStatusTimestampRow = { indexed_at: string | null }

export function useRagStatus(noteId: string | undefined): RagStatus {
  const { client, user } = useSupabase()
  const [status, setStatus] = useState<Omit<RagStatus, 'refresh'>>({
    chunkCount: 0,
    indexedAt: null,
    isLoading: true,
  })
  const [refreshTick, setRefreshTick] = useState(0)
  const refresh = useCallback(() => setRefreshTick((t) => t + 1), [])

  useEffect(() => {
    if (!noteId || !user) return

    let cancelled = false
    let inFlight = false

    const fetchStatus = async (showLoading = false) => {
      if (inFlight) return
      inFlight = true

      if (!cancelled && showLoading) {
        setStatus({ chunkCount: 0, indexedAt: null, isLoading: true })
      }

      try {
        const [countResult, latestResult] = await Promise.all([
          client
            .from('note_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('note_id', noteId)
            .eq('user_id', user.id),
          client
            .from('note_embeddings')
            .select('indexed_at')
            .eq('note_id', noteId)
            .eq('user_id', user.id)
            .order('indexed_at', { ascending: false })
            .limit(1),
        ])

        if (cancelled) return

        if (countResult.error || latestResult.error) {
          setStatus((prev) => ({ ...prev, isLoading: false }))
          return
        }

        const chunkCount = countResult.count ?? 0
        const indexedAt = chunkCount > 0 ? (latestResult.data?.[0] as RagStatusTimestampRow | undefined)?.indexed_at ?? null : null
        setStatus({ chunkCount, indexedAt, isLoading: false })
      } finally {
        inFlight = false
      }
    }

    void fetchStatus(true)
    const interval = setInterval(() => {
      void fetchStatus(false)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [noteId, user, client, refreshTick])

  // Derive the "no active note" state — avoids calling setState synchronously in the effect
  if (!noteId || !user) {
    return { chunkCount: 0, indexedAt: null, isLoading: false, refresh }
  }

  return { ...status, refresh }
}
