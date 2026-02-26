import { useMemo, useRef, useEffect, useCallback } from 'react'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { applyNoteOverlay } from '@core/utils/overlay'
import { mergeNoteFields, pickLatestNote } from '@core/utils/noteSnapshot'
import { useNotesQuery, useFlattenedNotes } from './useNotesQuery'
import { useNoteSearch } from './useNoteSearch'

// Derive the FTS data type directly from useNoteSearch to stay in sync with the source
type AggregatedFtsData = NonNullable<ReturnType<typeof useNoteSearch>['aggregatedFtsData']>

type UseNoteDataParams = {
  notesQuery: ReturnType<typeof useNotesQuery>
  offlineOverlay: CachedNote[]
  aggregatedFtsData: AggregatedFtsData | undefined
  selectedNoteIds: Set<string>
  showFTSResults: boolean
}

/**
 * Owns all computed/derived note data:
 * overlay-merge, FTS-merge, notesById, counts.
 */
export function useNoteData({
  notesQuery,
  offlineOverlay,
  aggregatedFtsData,
  selectedNoteIds,
  showFTSResults,
}: UseNoteDataParams) {
  const baseNotes: NoteViewModel[] = useFlattenedNotes(notesQuery)

  const notes: NoteViewModel[] = useMemo(() => {
    if (!offlineOverlay.length) return baseNotes
    return applyNoteOverlay(baseNotes, offlineOverlay) as NoteViewModel[]
  }, [baseNotes, offlineOverlay])

  const notesById = useMemo(() => {
    return new Map(notes.map((note) => [note.id, note]))
  }, [notes])

  const resolveSearchResult = useCallback((note: SearchResult): SearchResult => {
    const latest = pickLatestNote([notesById.get(note.id), note])
    if (!latest) return note
    return mergeNoteFields(note, latest)
  }, [notesById])

  const mergedFtsData = useMemo(() => {
    if (!aggregatedFtsData) return undefined
    if (!aggregatedFtsData.results.length) return aggregatedFtsData
    return {
      ...aggregatedFtsData,
      results: aggregatedFtsData.results.map(resolveSearchResult)
    }
  }, [aggregatedFtsData, resolveSearchResult])

  const pages = notesQuery.data?.pages
  const totalNotes = (pages?.length && typeof pages[0]?.totalCount === 'number')
    ? pages[0].totalCount
    : notes.length

  const notesDisplayed = showFTSResults && mergedFtsData ? mergedFtsData.results.length : notes.length
  const baseTotal = showFTSResults && mergedFtsData ? mergedFtsData.total : totalNotes
  const notesTotal = baseTotal
  const selectedCount = selectedNoteIds.size

  // Ref kept in sync for use in save handlers (avoids stale closure)
  const notesRef = useRef(notes)
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  return {
    notes,
    notesById,
    resolveSearchResult,
    mergedFtsData,
    totalNotes,
    notesDisplayed,
    notesTotal,
    selectedCount,
    notesRef,
  }
}
