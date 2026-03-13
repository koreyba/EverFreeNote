import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { getCachedNote } from '@ui/mobile/utils/noteCache'

type OpenNoteOptions = {
  chunkFocus?: {
    charOffset: number
    chunkLength: number
    requestId?: string
  }
}

export function useOpenNote() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useCallback((note: Note, options?: OpenNoteOptions) => {
    const cached = getCachedNote(queryClient, note.id, note)
    if (cached) {
      queryClient.setQueryData(['note', note.id], cached)
    }
    const chunkFocus = options?.chunkFocus
    if (!chunkFocus) {
      router.push(`/note/${note.id}`)
      return
    }

    router.push({
      pathname: '/note/[id]',
      params: {
        id: note.id,
        focusOffset: String(chunkFocus.charOffset),
        focusLength: String(chunkFocus.chunkLength),
        focusRequestId:
          chunkFocus.requestId ??
          `${note.id}:${chunkFocus.charOffset}:${chunkFocus.chunkLength}:${Date.now()}`,
      },
    })
  }, [queryClient, router])
}
