import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { databaseService } from '@ui/mobile/services/database'
import { useNetworkStatus } from './useNetworkStatus'
import type { Note } from '@core/types/domain'

export function useNotes(options: {
  page?: number
  pageSize?: number
  tag?: string | null
  searchQuery?: string
} = {}) {
  const { client, user } = useSupabase()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  return useQuery({
    queryKey: ['notes', user?.id, options],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      try {
        if (isOnline) {
          const result = await noteService.getNotes(user.id, options)
          // Cache results in local DB
          if (result.notes.length > 0) {
            await databaseService.saveNotes(result.notes)
          }
          return result
        }
      } catch (error) {
        console.warn('Failed to fetch from Supabase, falling back to local DB:', error)
      }

      // Fallback to local DB
      const localNotes = await databaseService.getLocalNotes(user.id)
      return {
        notes: localNotes as Note[],
        totalCount: localNotes.length,
        hasMore: false,
        nextCursor: undefined
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
        const id = Math.random().toString(36).substring(2, 15) // Temporary ID
        const manager = mobileSyncService.getManager()
        await manager.enqueue({
          noteId: id,
          operation: 'create',
          payload: { ...note, user_id: user.id } as Partial<Note>,
          clientUpdatedAt: new Date().toISOString()
        })

        // Save to local DB as well for immediate visibility
        await databaseService.saveNotes([{
          id,
          ...note,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Note])

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
        await databaseService.saveNotes([{ ...existing, ...updates, updated_at: new Date().toISOString() } as Note])
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
  const { client } = useSupabase()
  const queryClient = useQueryClient()
  const noteService = new NoteService(client)
  const isOnline = useNetworkStatus()

  return useMutation({
    mutationFn: async (id: string) => {
      // Mark as deleted locally
      await databaseService.saveNotes([{ id, is_deleted: 1 } as unknown as Note])

      if (isOnline) {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
