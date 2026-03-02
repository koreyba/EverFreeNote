import { useEffect, useState } from 'react'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

export interface RagStatus {
  chunkCount: number
  indexedAt: string | null
  isLoading: boolean
}

const POLL_INTERVAL_MS = 3000

export function useRagStatus(noteId: string | undefined): RagStatus {
  const { supabase, user } = useSupabase()
  const [status, setStatus] = useState<RagStatus>({
    chunkCount: 0,
    indexedAt: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!noteId || !user) {
      setStatus({ chunkCount: 0, indexedAt: null, isLoading: false })
      return
    }

    let cancelled = false

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('note_embeddings')
        .select('chunk_index, indexed_at')
        .eq('note_id', noteId)
        .eq('user_id', user.id)

      if (cancelled) return
      if (error) {
        setStatus(prev => ({ ...prev, isLoading: false }))
        return
      }

      const chunkCount = data?.length ?? 0
      const indexedAt = chunkCount > 0 ? (data?.[0]?.indexed_at ?? null) : null
      setStatus({ chunkCount, indexedAt, isLoading: false })
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [noteId, user, supabase])

  return status
}
