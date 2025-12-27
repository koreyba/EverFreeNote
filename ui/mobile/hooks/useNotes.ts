import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { databaseService } from '@ui/mobile/services/database'
import { useNetworkStatus } from './useNetworkStatus'
import type { Note } from '@core/types/domain'

type NotesPage = {
  notes: Note[]
  totalCount: number
  hasMore: boolean
  nextCursor?: number
}

const generateUuidV4 = (): string => {
  const cryptoObj = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
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

      try {
        if (isOnline) {
          const note = await noteService.getNote(id)
          await databaseService.saveNotes([note])
          return note
        }
      } catch (error) {
        console.warn('Failed to fetch note from Supabase, falling back to local DB:', error)
      }

      // Fallback to local DB
      const localNotes = await databaseService.getLocalNotes(user.id)
      return localNotes.find(n => n.id === id) ?? null
    },
    enabled: !!user?.id && !!id,
    staleTime: 1000 * 60,
  })
}

export function useCreateNote() {
  const { client, user } = useSupabase()
  const queryClient = useQueryClient()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  return useMutation({
    mutationFn: async (note: Pick<Note, 'title' | 'description' | 'tags'>) => {
      if (!user?.id) throw new Error('User not authenticated')

      if (isOnline) {
        return await noteService.createNote({ ...note, userId: user.id })
      } else {
        const id = generateUuidV4()
        const manager = mobileSyncService.getManager()
        await manager.enqueue({
          noteId: id,
          operation: 'create',
          payload: { id, ...note, user_id: user.id } as Partial<Note>,
          clientUpdatedAt: new Date().toISOString()
        })

        // Save to local DB as well for immediate visibility
        await databaseService.saveNotes([{
          id,
          ...note,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_synced: 0,
          is_deleted: 0,
        }])

        return { id, ...note } as Note
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

export function useUpdateNote() {
  const { client, user } = useSupabase()
  const queryClient = useQueryClient()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<Note, 'title' | 'description' | 'tags'>>
    }) => {
      // Local update first for immediate response
      const localNotes = await databaseService.getLocalNotes(user?.id ?? '')
      const existing = localNotes.find(n => n.id === id)
      if (existing) {
        await databaseService.saveNotes([{
          ...existing,
          ...updates,
          updated_at: new Date().toISOString(),
          is_synced: 0,
        }])
      }

      if (isOnline) {
        return await noteService.updateNote(id, updates)
      } else {
        const manager = mobileSyncService.getManager()
        await manager.enqueue({
          noteId: id,
          operation: 'update',
          payload: updates as Partial<Note>,
          clientUpdatedAt: new Date().toISOString()
        })
        return { id, ...updates } as Note
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['note'] })
    },
  })
}

export function useDeleteNote() {
  const { client, user } = useSupabase()
  const queryClient = useQueryClient()
  const noteService = new NoteService(client)

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      await databaseService.markDeleted(id, user.id)

      // Check network status at execution time, not at hook render time
      const netInfo = await import('@react-native-community/netinfo').then(m => m.default.fetch())
      const isCurrentlyOnline = netInfo.isConnected && netInfo.isInternetReachable

      if (isCurrentlyOnline) {
        return await noteService.deleteNote(id)
      } else {
        const manager = mobileSyncService.getManager()
        await manager.enqueue({
          noteId: id,
          operation: 'delete',
          payload: {},
          clientUpdatedAt: new Date().toISOString()
        })
        return id
      }
    },
    onMutate: async (id) => {
      // Cancel queries to prevent old data from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['notes'] })

      // Snapshot the previous value
      const previousNotes = queryClient.getQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'] })

      // Optimistically update all matching queries
      queryClient.setQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'] }, (data) => {
        if (!data) return data
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notes: page.notes.filter((note) => note.id !== id),
            totalCount: Math.max(0, page.totalCount - 1),
          })),
        }
      })

      return { previousNotes }
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotes) {
        // Rollback all queries
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: (_, error) => {
      // Refetch only if there was an error to ensure consistency
      if (error) {
        void queryClient.invalidateQueries({ queryKey: ['notes'] })
      }
    },
  })
}
