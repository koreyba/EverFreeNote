import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import type { Note } from '@core/types/domain'

type OpenNoteOptions = {
  chunkFocus?: {
    charOffset: number
    chunkLength: number
    requestId?: string
  }
}

export function useOpenNote() {
  const router = useRouter()

  return useCallback((note: Note, options?: OpenNoteOptions) => {
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
  }, [router])
}
