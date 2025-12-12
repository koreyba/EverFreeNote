import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'
import { toast } from 'sonner'
import { useMemo } from 'react'

import type { Tables } from '@/supabase/types'

/**
 * Custom hooks for note mutations with optimistic updates
 * Provides instant UI feedback before server confirmation
 */
type Note = Tables<'notes'>

type CreateNoteParams = Pick<Note, 'title' | 'description' | 'tags'> & { userId: string }
type UpdateNoteParams = Pick<Note, 'id' | 'title' | 'description' | 'tags'>
type DeleteNoteParams = { id: string; silent?: boolean }

type NotesPage = {
  notes: Note[]
  nextCursor?: number
  totalCount: number
  hasMore: boolean
}

type NotesData = {
  pages: NotesPage[]
  pageParams: number[]
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  const { supabase } = useSupabase()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])

  return useMutation({
    mutationFn: async (params: CreateNoteParams) => {
      return noteService.createNote(params)
    },

    // Optimistic update: Add note immediately to UI
    onMutate: async (newNote) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes'] })

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<NotesData>(['notes'])

      // Optimistically update cache
      queryClient.setQueryData<NotesData>(['notes'], (old) => {
        const optimisticNote: Note = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: newNote.title,
          description: newNote.description,
          tags: newNote.tags,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: newNote.userId,
        }

        // Handle case when no pages exist yet
        if (!old?.pages || old.pages.length === 0) {
          return {
            pages: [{
              notes: [optimisticNote],
              nextCursor: undefined,
              totalCount: 1,
              hasMore: false
            }],
            pageParams: [0]
          }
        }

        // Add to first page
        const newPages = [...old.pages]
        newPages[0] = {
          ...newPages[0],
          notes: [optimisticNote, ...newPages[0].notes],
        }

        return { ...old, pages: newPages }
      })

      return { previousNotes }
    },

    // Rollback on error
    onError: (err, newNote, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
      toast.error('Failed to create note: ' + err.message)
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note created successfully')
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  const { supabase } = useSupabase()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])

  return useMutation({
    mutationFn: async (params: UpdateNoteParams) => {
      return noteService.updateNote(params.id, {
        title: params.title,
        description: params.description,
        tags: params.tags
      })
    },

    // Optimistic update
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<NotesData>(['notes'])

      // Update cache
      queryClient.setQueryData<NotesData>(['notes'], (old) => {
        if (!old?.pages) return old

        const newPages = old.pages.map((page) => ({
          ...page,
          notes: page.notes.map((note) =>
            note.id === updatedNote.id
              ? {
                ...note,
                title: updatedNote.title,
                description: updatedNote.description,
                tags: updatedNote.tags,
                updated_at: new Date().toISOString(),
              }
              : note
          ),
        }))

        return { ...old, pages: newPages }
      })

      return { previousNotes }
    },

    onError: (err, updatedNote, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
      toast.error('Failed to update note: ' + err.message)
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note updated successfully')
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  const { supabase } = useSupabase()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])

  return useMutation({
    mutationFn: async ({ id }: DeleteNoteParams) => {
      return noteService.deleteNote(id)
    },

    // Optimistic update
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<NotesData>(['notes'])

      // Remove from cache
      queryClient.setQueryData<NotesData>(['notes'], (old) => {
        if (!old?.pages) return old

        const newPages = old.pages.map((page) => ({
          ...page,
          notes: page.notes.filter((note) => note.id !== id),
        }))

        return { ...old, pages: newPages }
      })

      return { previousNotes }
    },

    onError: (err, _vars, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
      toast.error('Failed to delete note: ' + err.message)
    },

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (!vars?.silent) {
        toast.success('Note deleted successfully')
      }
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()
  const { supabase } = useSupabase()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])

  return useMutation({
    mutationFn: async ({ noteId, updatedTags }: { noteId: string; updatedTags: string[] }) => {
      return noteService.updateNote(noteId, { tags: updatedTags })
    },

    // Optimistic update
    onMutate: async ({ noteId, updatedTags }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData<NotesData>(['notes'])

      queryClient.setQueryData<NotesData>(['notes'], (old) => {
        if (!old?.pages) return old

        const newPages = old.pages.map((page) => ({
          ...page,
          notes: page.notes.map((note) =>
            note.id === noteId
              ? {
                ...note,
                tags: updatedTags,
                updated_at: new Date().toISOString(),
              }
              : note
          ),
        }))

        return { ...old, pages: newPages }
      })

      return { previousNotes, noteId, updatedTags }
    },

    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes)
      }
      toast.error('Failed to remove tag: ' + err.message)
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

