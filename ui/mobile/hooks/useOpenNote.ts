import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { getCachedNote } from '@ui/mobile/utils/noteCache'
import { databaseService } from '@ui/mobile/services/database'

type NoteSnapshot = Pick<Note, 'id'> & Partial<Omit<Note, 'id'>>
type NoteDetailData = {
  note: Note | null
  status: 'found' | 'missing' | 'deleted'
}

type OpenNoteOptions = {
  chunkFocus?: {
    charOffset: number
    chunkLength: number
    requestId?: string
  }
}

const normalizeNoteSnapshot = (note: NoteSnapshot): Note => ({
  id: note.id,
  title: note.title ?? '',
  description: note.description ?? '',
  tags: note.tags ?? [],
  created_at: note.created_at ?? '',
  updated_at: note.updated_at ?? '',
  user_id: note.user_id ?? '',
})

const hasRenderableSnapshot = (note: NoteSnapshot) => (
  note.title !== undefined ||
  note.description !== undefined ||
  note.tags !== undefined ||
  note.updated_at !== undefined ||
  note.created_at !== undefined ||
  note.user_id !== undefined
)

const seedNoteDetailCache = (queryClient: ReturnType<typeof useQueryClient>, note: Note) => {
  queryClient.setQueryData<NoteDetailData>(['note', note.id], {
    note,
    status: 'found',
  })
}

export function useOpenNote() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useCallback(async (note: NoteSnapshot, options?: OpenNoteOptions) => {
    const normalizedSnapshot = hasRenderableSnapshot(note) ? normalizeNoteSnapshot(note) : undefined
    const cached = getCachedNote(queryClient, note.id, normalizedSnapshot)
    const seed = cached ?? normalizedSnapshot

    if (seed) {
      seedNoteDetailCache(queryClient, seed)
    } else {
      const localNote = await databaseService.getLocalNoteById(note.id)
      if (localNote) {
        seedNoteDetailCache(queryClient, localNote)
      }
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
