import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { databaseService } from '@ui/mobile/services/database'
import { useNetworkStatus } from './useNetworkStatus'
import { mobileNetworkStatusProvider } from '@ui/mobile/adapters/networkStatus'
import { updateNoteCaches } from '@ui/mobile/utils/noteCache'
import type { Note } from '@core/types/domain'
import type { NotesPage } from './useNotes'

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

type SearchPage = {
  results: { id: string }[]
  total: number
  hasMore: boolean
  nextCursor?: number
  method?: string
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
      if (!user?.id) throw new Error('User not authenticated')
      // Local update first for immediate response
      const localNotes = await databaseService.getLocalNotes(user.id)
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
    onMutate: ({ id, updates }) => {
      const updatedAt = new Date().toISOString()
      updateNoteCaches(queryClient, id, updates, { updatedAt })
      return { updatedAt }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['note'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
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

      // Check network status at execution time using adapter
      const isCurrentlyOnline = mobileNetworkStatusProvider.isOnline()

      if (isCurrentlyOnline) {
        try {
          return await noteService.deleteNote(id)
        } catch {
          // Fallback: if online delete fails (e.g., captive portal, network error),
          // enqueue for later sync to prevent data loss
          const manager = mobileSyncService.getManager()
          await manager.enqueue({
            noteId: id,
            operation: 'delete',
            payload: {},
            clientUpdatedAt: new Date().toISOString()
          })
          return id
        }
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
      await queryClient.cancelQueries({ queryKey: ['search'] })

      // Snapshot the previous values
      const previousNotes = queryClient.getQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'] })
      const previousSearch = queryClient.getQueriesData<InfiniteData<SearchPage>>({ queryKey: ['search'] })
      const activeNotes = queryClient.getQueriesData<InfiniteData<NotesPage>>({ queryKey: ['notes'], type: 'active' })
      const shouldRefetch = activeNotes.some(([, data]) => !data)

      // Optimistically update all notes queries
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

      // Optimistically update all search queries
      queryClient.setQueriesData<InfiniteData<SearchPage>>({ queryKey: ['search'] }, (data) => {
        if (!data) return data
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            results: page.results.filter((result) => result.id !== id),
            total: Math.max(0, page.total - 1),
          })),
        }
      })

      return { previousNotes, previousSearch, shouldRefetch }
    },
    onError: (_err, _id, context) => {
      if (context?.previousNotes) {
        // Rollback notes queries
        context.previousNotes.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousSearch) {
        // Rollback search queries
        context.previousSearch.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: (_, error, _id, context) => {
      if (!error) {
        // Remove stale single-note cache so detail views are reconciled after deletion
        void queryClient.removeQueries({ queryKey: ['note', _id] })
      }
      // Refetch if an error occurred or we canceled an in-flight query without cache
      if (error || context?.shouldRefetch) {
        void queryClient.invalidateQueries({ queryKey: ['notes'] })
        void queryClient.invalidateQueries({ queryKey: ['search'] })
      }
    },
  })
}
