import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import { deleteTagFromNotes, renameTagInNotes } from '@core/services/tags'
import type { Note } from '@core/types/domain'
import { databaseService } from '@ui/mobile/services/database'
import { mobileNetworkStatusProvider } from '@ui/mobile/adapters/networkStatus'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { getTagManagementQueryKey } from './useTagManagement'

type TagMutationInput = {
  tag: string
  replacement?: string
}

type TagMutationOperation = 'renameTag' | 'deleteTag'

type TagManagementQueryData = {
  notes: Note[]
  usedLocalFallback: boolean
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
  '57P01',
  '57P03',
])
const RETRYABLE_ERROR_PATTERNS = [
  'failed to fetch',
  'network request failed',
  'fetch failed',
  'load failed',
  'network timeout',
  'connection reset',
  'connection refused',
  'timed out',
] as const

const isRetryableBulkMutationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown; name?: unknown; status?: unknown }
  if (typeof candidate.status === 'number' && RETRYABLE_STATUS_CODES.has(candidate.status)) return true
  const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : undefined
  if (candidate.name === 'AbortError') return true
  if (code && (RETRYABLE_ERROR_CODES.has(code) || code.startsWith('08'))) return true

  if (typeof candidate.message !== 'string') return false
  const message = candidate.message.toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

const normalizeInput = (operation: TagMutationOperation, input: TagMutationInput) => {
  const tag = input.tag.trim()
  const replacement = input.replacement?.trim()

  if (!tag) throw new Error('Tag cannot be empty')
  if (operation === 'renameTag' && !replacement) {
    throw new Error('Replacement tag cannot be empty')
  }

  return { tag, replacement }
}

const getOptimisticNotes = (
  notes: Note[],
  operation: TagMutationOperation,
  tag: string,
  replacement?: string
) => operation === 'renameTag'
  ? renameTagInNotes(notes, tag, replacement ?? '')
  : deleteTagFromNotes(notes, tag)

const getQueueNoteId = (userId: string, operation: TagMutationOperation, tag: string) => (
  `tag:${userId}:${operation}:${tag.toLowerCase()}`
)

export function useTagMutation(operation: TagMutationOperation) {
  const { client, user } = useSupabase()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TagMutationInput) => {
      if (!user?.id) throw new Error('User not authenticated')

      const normalized = normalizeInput(operation, input)
      const queryKey = getTagManagementQueryKey(user.id)
      const cached = queryClient.getQueryData<TagManagementQueryData>(queryKey)
      const storedLocalNotes = await databaseService.getLocalNotes(user.id)
      const localNotes = storedLocalNotes.length > 0
        ? storedLocalNotes
        : cached?.notes ?? []
      const optimisticNotes = getOptimisticNotes(
        localNotes,
        operation,
        normalized.tag,
        normalized.replacement
      )
      const changedLocalNotes = optimisticNotes
        .filter((note, index) => note !== localNotes[index])
        .map((note) => ({
          ...note,
          updated_at: new Date().toISOString(),
          is_synced: 0,
          is_deleted: 0,
        }))

      if (changedLocalNotes.length > 0) {
        await databaseService.saveNotes(changedLocalNotes)
      }

      const queueBulkMutation = async () => {
        const manager = mobileSyncService.getManager()
        await manager.enqueue({
          noteId: getQueueNoteId(user.id, operation, normalized.tag),
          operation,
          payload: {
            tag: normalized.tag.toLowerCase(),
            ...(normalized.replacement ? { replacement: normalized.replacement } : {}),
            user_id: user.id,
          },
          clientUpdatedAt: new Date().toISOString(),
        })
        return { queued: true, changedNotes: changedLocalNotes }
      }

      if (!mobileNetworkStatusProvider.isOnline() || !client) {
        return queueBulkMutation()
      }

      try {
        const service = new NoteService(client)
        const persistedNotes = operation === 'renameTag'
          ? await service.renameTag(user.id, normalized.tag, normalized.replacement ?? '')
          : await service.deleteTag(user.id, normalized.tag)

        if (persistedNotes.length > 0) {
          await databaseService.saveNotes(persistedNotes.map((note) => ({
            ...note,
            is_synced: 1,
            is_deleted: 0,
          })))
        }

        return { queued: false, changedNotes: persistedNotes }
      } catch (error) {
        console.warn('Online tag mutation failed', error)
        if (!isRetryableBulkMutationError(error)) throw error
        return queueBulkMutation()
      }
    },
    onMutate: async (input) => {
      if (!user?.id) return undefined

      const normalized = normalizeInput(operation, input)
      const queryKey = getTagManagementQueryKey(user.id)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<TagManagementQueryData>(queryKey)

      if (previous) {
        queryClient.setQueryData<TagManagementQueryData>(queryKey, {
          ...previous,
          notes: getOptimisticNotes(
            previous.notes,
            operation,
            normalized.tag,
            normalized.replacement
          ),
        })
      }

      return { queryKey, previous }
    },
    onError: async (_error, _input, context) => {
      if (!context?.previous || !user?.id) return
      queryClient.setQueryData(context.queryKey, context.previous)
      await databaseService.saveNotes(context.previous.notes)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getTagManagementQueryKey(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['tags', 'all-with-counts'] })
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['mobileAiSearch'] })
    },
  })
}

export function useRenameTag() {
  return useTagMutation('renameTag')
}

export function useDeleteTag() {
  return useTagMutation('deleteTag')
}
