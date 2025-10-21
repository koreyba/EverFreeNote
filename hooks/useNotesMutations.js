import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * Custom hooks for note mutations with optimistic updates
 * Provides instant UI feedback before server confirmation
 */

export function useCreateNote() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ title, description, tags, userId }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title,
            description,
            tags,
            user_id: userId,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Optimistic update: Add note immediately to UI
    onMutate: async (newNote) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes'] })

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData(['notes'])

      // Optimistically update cache
      queryClient.setQueryData(['notes'], (old) => {
        const optimisticNote = {
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
      queryClient.setQueryData(['notes'], context.previousNotes)
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
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, title, description, tags }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          description,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Optimistic update
    onMutate: async (updatedNote) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData(['notes'])

      // Update cache
      queryClient.setQueryData(['notes'], (old) => {
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
      queryClient.setQueryData(['notes'], context.previousNotes)
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
  const supabase = createClient()

  return useMutation({
    mutationFn: async (noteId) => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId)
      if (error) throw error
      return noteId
    },

    // Optimistic update
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData(['notes'])

      // Remove from cache
      queryClient.setQueryData(['notes'], (old) => {
        if (!old?.pages) return old

        const newPages = old.pages.map((page) => ({
          ...page,
          notes: page.notes.filter((note) => note.id !== noteId),
        }))

        return { ...old, pages: newPages }
      })

      return { previousNotes }
    },

    onError: (err, noteId, context) => {
      queryClient.setQueryData(['notes'], context.previousNotes)
      toast.error('Failed to delete note: ' + err.message)
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted successfully')
    },
  })
}

export function useRemoveTag() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ noteId, updatedTags }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single()

      if (error) throw error
      return data
    },

    // Optimistic update
    onMutate: async ({ noteId, updatedTags }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] })
      const previousNotes = queryClient.getQueryData(['notes'])

      queryClient.setQueryData(['notes'], (old) => {
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
      queryClient.setQueryData(['notes'], context.previousNotes)
      toast.error('Failed to remove tag: ' + err.message)
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

