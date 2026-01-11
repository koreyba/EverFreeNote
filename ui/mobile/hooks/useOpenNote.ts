import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { getCachedNote } from '@ui/mobile/utils/noteCache'

export function useOpenNote() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useCallback((note: Note) => {
    const cached = getCachedNote(queryClient, note.id, note)
    if (cached) {
      queryClient.setQueryData(['note', note.id], cached)
    }
    router.push(`/note/${note.id}`)
  }, [queryClient, router])
}
