import { useEffect, useState } from 'react'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

export interface RagStatus {
  chunkCount: number
  indexedAt: string | null
  isLoading: boolean
}

const POLL_INTERVAL_MS = 3000
type RagStatusRow = { indexed_at: string | null }

function getLatestIndexedAt(rows: RagStatusRow[] | null): string | null {
  if (!rows || rows.length === 0) return null

  let latestValue: string | null = null
  let latestTs = Number.NEGATIVE_INFINITY

  for (const row of rows) {
    const value = row.indexed_at
    if (!value) continue
    const ts = Date.parse(value)
    if (Number.isNaN(ts)) continue
    if (ts > latestTs) {
      latestTs = ts
      latestValue = value
    }
  }

  return latestValue
}

export function useRagStatus(noteId: string | undefined): RagStatus {
  const { supabase, user } = useSupabase()
  const [status, setStatus] = useState<RagStatus>({
    chunkCount: 0,
    indexedAt: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!noteId || !user) return

    let cancelled = false

    const fetchStatus = async (showLoading = false) => {
      if (!cancelled && showLoading) {
        setStatus({ chunkCount: 0, indexedAt: null, isLoading: true })
      }

      const { data, error } = await supabase
        .from('note_embeddings')
        .select('chunk_index, indexed_at')
        .eq('note_id', noteId)
        .eq('user_id', user.id)

      if (cancelled) return
      if (error) {
        setStatus({ chunkCount: 0, indexedAt: null, isLoading: false })
        return
      }

      const chunkCount = data?.length ?? 0
      const indexedAt = chunkCount > 0 ? getLatestIndexedAt(data as RagStatusRow[]) : null
      setStatus({ chunkCount, indexedAt, isLoading: false })
    }

    void fetchStatus(true)
    const interval = setInterval(() => {
      void fetchStatus(false)
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [noteId, user, supabase])

  // Derive the "no active note" state — avoids calling setState synchronously in the effect
  if (!noteId || !user) {
    return { chunkCount: 0, indexedAt: null, isLoading: false }
  }

  return status
}
