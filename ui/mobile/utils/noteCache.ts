import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'

type NotesPage = {
  notes: Note[]
}

type SearchPage<T extends Note = Note> = {
  results: T[]
}

type NotePatch = Partial<Pick<Note, 'title' | 'description' | 'tags' | 'updated_at'>>

const getUpdatedAtMs = (note?: { updated_at?: string | null }): number => {
  if (!note?.updated_at) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(note.updated_at)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

const applyPatch = <T extends Note>(note: T, patch: NotePatch): T => {
  if (Object.keys(patch).length === 0) return note
  return { ...note, ...patch }
}

const findNoteInNotesCache = (queryClient: QueryClient, noteId: string): Note | undefined => {
  const queries = queryClient.getQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'] })
  for (const [, data] of queries) {
    if (!data) continue
    for (const page of data.pages) {
      const match = page.notes.find((note) => note.id === noteId)
      if (match) return match
    }
  }
  return undefined
}

const findNoteInSearchCache = <T extends Note>(queryClient: QueryClient, noteId: string): T | undefined => {
  const queries = queryClient.getQueriesData<InfiniteData<SearchPage<T>>>({ queryKey: ['search'] })
  for (const [, data] of queries) {
    if (!data) continue
    for (const page of data.pages) {
      const match = page.results.find((note) => note.id === noteId)
      if (match) return match
    }
  }
  return undefined
}

export const getCachedNote = <T extends Note>(
  queryClient: QueryClient,
  noteId: string,
  fallback?: T
): T | undefined => {
  const direct = queryClient.getQueryData<T>(['note', noteId])
  const fromNotes = findNoteInNotesCache(queryClient, noteId) as T | undefined
  const fromSearch = findNoteInSearchCache<T>(queryClient, noteId)

  const candidates = [direct, fromNotes, fromSearch, fallback].filter(Boolean) as T[]
  if (!candidates.length) return undefined

  return candidates.reduce((best, current) => (
    getUpdatedAtMs(current) > getUpdatedAtMs(best) ? current : best
  ))
}

const buildPatch = (
  updates: Partial<Pick<Note, 'title' | 'description' | 'tags'>>,
  updatedAt?: string
): NotePatch => {
  const patch: NotePatch = {}

  if (updates.title !== undefined) {
    patch.title = updates.title
  }
  if (updates.description !== undefined) {
    patch.description = updates.description
  }
  if (updates.tags !== undefined) {
    patch.tags = updates.tags
  }
  if (updatedAt) {
    patch.updated_at = updatedAt
  }

  return patch
}

export const updateNoteCaches = (
  queryClient: QueryClient,
  noteId: string,
  updates: Partial<Pick<Note, 'title' | 'description' | 'tags'>>,
  options: { updatedAt?: string } = {}
) => {
  const patch = buildPatch(updates, options.updatedAt)
  if (Object.keys(patch).length === 0) return

  const fallback = getCachedNote(queryClient, noteId)

  queryClient.setQueryData<Note | undefined>(['note', noteId], (current) => {
    const base = current ?? fallback
    return base ? applyPatch(base, patch) : current
  })

  queryClient.setQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'] }, (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        notes: page.notes.map((note) => (
          note.id === noteId ? applyPatch(note, patch) : note
        )),
      })),
    }
  })

  queryClient.setQueriesData<InfiniteData<SearchPage>>({ queryKey: ['search'] }, (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        results: page.results.map((note) => (
          note.id === noteId ? applyPatch(note, patch) : note
        )),
      })),
    }
  })
}
