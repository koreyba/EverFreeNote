import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useRef } from 'react'
import { NoteService } from '@core/services/notes'

type CleanupProps = {
  supabase: SupabaseClient
  userId?: string
  isOffline: boolean
  ready: boolean
  activityKey?: string
  onCleaned: () => void
  getSessionSnapshot?: () => { userId: string | null; epoch: number }
}
export function useTrashCleanup({
  supabase,
  userId,
  isOffline,
  ready,
  activityKey,
  onCleaned,
  getSessionSnapshot,
}: CleanupProps) {
  const last = useRef<{ owner?: string; time: number }>({
    time: Number.NEGATIVE_INFINITY,
  })
  useEffect(() => {
    if (!userId || isOffline || !ready || typeof supabase.rpc !== 'function')
      return
    let disposed = false
    const sweep = () => {
      if (
        disposed ||
        document.visibilityState === 'hidden' ||
        (last.current.owner === userId &&
          Date.now() - last.current.time < 3600000)
      )
        return
      const started = getSessionSnapshot?.()
      const current = () =>
        !disposed &&
        (!started || getSessionSnapshot?.().epoch === started.epoch)
      const run = globalThis.crypto?.randomUUID?.()
      if (!run) return
      last.current = { owner: userId, time: Date.now() }
      void new NoteService(supabase)
        .cleanupExpiredTrash(run, current)
        .then((removed) => {
          if (!current()) return
          if (removed) onCleaned()
          if (supabase.functions?.invoke)
            void supabase.functions.invoke('trash-cleanup').catch(() => {})
        })
        .catch((error) => {
          if (current())
            console.warn('Trash cleanup will retry on a later visit:', error)
        })
    }
    const initial = window.setTimeout(sweep, 0)
    const interval = window.setInterval(sweep, 3600000)
    window.addEventListener('focus', sweep)
    window.addEventListener('online', sweep)
    document.addEventListener('visibilitychange', sweep)
    return () => {
      disposed = true
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('focus', sweep)
      window.removeEventListener('online', sweep)
      document.removeEventListener('visibilitychange', sweep)
    }
  }, [
    supabase,
    userId,
    isOffline,
    ready,
    activityKey,
    onCleaned,
    getSessionSnapshot,
  ])
}
