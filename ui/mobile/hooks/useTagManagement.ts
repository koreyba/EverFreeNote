import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@ui/mobile/providers'
import { NoteService } from '@core/services/notes'
import type { Note } from '@core/types/domain'
import { databaseService } from '@ui/mobile/services/database'
import { useNetworkStatus } from './useNetworkStatus'
import {
  filterMobileTagSummaries,
  getMobileTagLetters,
  getMobileTagSummaries,
  groupMobileTagSummaries,
  type MobileTagSummary,
} from '@ui/mobile/utils/tagManagement'

export const getTagManagementQueryKey = (userId: string | undefined) => (
  ['tags', 'management', userId] as const
)

type TagManagementQueryResult = {
  notes: Note[]
  usedLocalFallback: boolean
}

const EMPTY_NOTES: Note[] = []

export function useTagManagementData() {
  const { client, user } = useSupabase()
  const isOnline = useNetworkStatus()

  const query = useQuery<TagManagementQueryResult>({
    queryKey: getTagManagementQueryKey(user?.id),
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      if (!isOnline) {
        return {
          notes: await databaseService.getLocalNotes(user.id),
          usedLocalFallback: true,
        }
      }

      if (!client) throw new Error('Supabase client unavailable')

      try {
        const notes = await new NoteService(client).getAllNotes(user.id)
        await databaseService.replaceNotesForUser(user.id, notes)
        return { notes, usedLocalFallback: false }
      } catch (error) {
        const localNotes = await databaseService.getLocalNotes(user.id)
        if (localNotes.length === 0) throw error
        return { notes: localNotes, usedLocalFallback: true }
      }
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  })

  const notes = query.data?.notes ?? EMPTY_NOTES
  const allTags = useMemo(() => getMobileTagSummaries(notes), [notes])
  const groups = useMemo(() => groupMobileTagSummaries(allTags), [allTags])
  const letters = useMemo(() => getMobileTagLetters(allTags), [allTags])

  return {
    ...query,
    notes,
    allTags,
    groups,
    letters,
    filterTags: (search: string, selectedLetter: string | null): MobileTagSummary[] => (
      filterMobileTagSummaries(allTags, search, selectedLetter)
    ),
  }
}
