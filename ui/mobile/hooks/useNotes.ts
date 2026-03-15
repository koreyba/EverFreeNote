import { useQuery, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import { databaseService } from '@ui/mobile/services/database'
import { useNetworkStatus } from './useNetworkStatus'
import type { Note } from '@core/types/domain'

export type NotesPage = {
  notes: Note[]
  totalCount: number
  hasMore: boolean
  nextCursor?: number
}

export function useNotes(options: {
  pageSize?: number
  tag?: string | null
  searchQuery?: string
} = {}) {
  const { client, user } = useSupabase()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  const pageSize = options.pageSize ?? 50
  const keyOptions = {
    pageSize,
    tag: options.tag ?? null,
    searchQuery: options.searchQuery ?? '',
  }

  const queryKey = ['notes', user?.id, keyOptions] as const

  return useInfiniteQuery<NotesPage, Error, InfiniteData<NotesPage>, typeof queryKey, number>({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }) => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        if (isOnline) {
          const result = await noteService.getNotes(user.id, {
            page: pageParam,
            pageSize,
            tag: options.tag,
            searchQuery: options.searchQuery,
          })
          // Cache results in local DB
          if (result.notes.length > 0) {
            await databaseService.saveNotes(result.notes)
          }
          return result
        }
      } catch (error) {
        console.warn('Failed to fetch from Supabase, falling back to local DB:', error)
      }

      if (pageParam !== 0) {
        return {
          notes: [] as Note[],
          totalCount: 0,
          hasMore: false,
          nextCursor: undefined,
        }
      }

      // Fallback to local DB (first page only)
      const localNotes = await databaseService.getLocalNotes(user.id)
      return {
        notes: localNotes as Note[],
        totalCount: localNotes.length,
        hasMore: false,
        nextCursor: undefined,
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useNote(id: string) {
  const { client, user } = useSupabase()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  return useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      if (isOnline) {
        if (await databaseService.hasPendingWrites(id)) {
          const localNotes = await databaseService.getLocalNotes(user.id)
          const localNote = localNotes.find(n => n.id === id) ?? null
          return {
            note: localNote,
            status: localNote ? 'found' as const : 'missing' as const,
          }
        }

        const remoteResult = await noteService.getNoteStatus(id)

        if (remoteResult.status === 'found') {
          await databaseService.saveNotes([remoteResult.note])
          return {
            note: remoteResult.note as Note,
            status: 'found' as const,
          }
        }

        if (remoteResult.status === 'not_found') {
          await databaseService.markDeleted(id, user.id)
          return {
            note: null,
            status: 'deleted' as const,
          }
        }

        console.warn('Failed to fetch note from Supabase, falling back to local DB:', remoteResult.error)
      }

      // Fallback to local DB
      const localNotes = await databaseService.getLocalNotes(user.id)
      const localNote = localNotes.find(n => n.id === id) ?? null

      return {
        note: localNote,
        status: localNote ? 'found' as const : 'missing' as const,
      }
    },
    enabled: !!user?.id && !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
