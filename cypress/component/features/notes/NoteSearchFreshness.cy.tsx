import React from 'react'
import { NoteList } from '../../../../ui/web/components/features/notes/NoteList'
import type { Note, SearchResult } from '../../../../core/types/domain'
import { mergeNoteFields, pickLatestNote } from '../../../../core/utils/noteSnapshot'

const latestNote: Note = {
  id: 'note-1',
  title: 'Updated title',
  description: 'Updated description',
  tags: ['alpha'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  user_id: 'user-1',
}

const staleSearchResult: SearchResult = {
  ...latestNote,
  title: 'Old title',
  description: 'Old description',
  updated_at: '2024-01-01T00:00:00Z',
  headline: 'Old headline',
  rank: 0.9,
  content: 'Old content',
}

const SearchHarness = () => {
  const [selectedNote, setSelectedNote] = React.useState<SearchResult | null>(null)
  const notes = React.useMemo(() => [latestNote], [])
  const searchResults = React.useMemo(() => [staleSearchResult], [])
  const noop = React.useCallback(() => {}, [])

  const notesById = React.useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])

  const resolveSearchResult = React.useCallback((note: SearchResult): SearchResult => {
    const latest = pickLatestNote([notesById.get(note.id), note])
    if (!latest) return note
    return mergeNoteFields(note, latest)
  }, [notesById])

  const ftsData = React.useMemo(() => ({
    total: searchResults.length,
    executionTime: 5,
    results: searchResults.map(resolveSearchResult),
  }), [searchResults, resolveSearchResult])

  return (
    <div style={{ height: 500, width: 400 }}>
      <NoteList
        notes={notes}
        isLoading={false}
        selectionMode={false}
        selectedIds={new Set()}
        onToggleSelect={noop}
        onSelectNote={noop}
        onTagClick={noop}
        onLoadMore={noop}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery="old"
        ftsLoading={false}
        showFTSResults
        ftsData={ftsData}
        ftsHasMore={false}
        ftsLoadingMore={false}
        onLoadMoreFts={noop}
        onSearchResultClick={(note) => setSelectedNote(resolveSearchResult(note))}
        height={400}
        width={360}
      />
      <div data-cy="selected-title">{selectedNote?.title ?? ''}</div>
      <div data-cy="selected-description">{selectedNote?.description ?? ''}</div>
    </div>
  )
}

describe('Note search results freshness (web)', () => {
  it('shows latest note data when selecting a stale search result', () => {
    cy.mount(<SearchHarness />)

    cy.get('[data-testid="note-card"]').first().should('contain', 'Updated title')
    cy.get('[data-testid="note-card"]').first().click()

    cy.get('[data-cy="selected-title"]').should('contain', 'Updated title')
    cy.get('[data-cy="selected-description"]').should('contain', 'Updated description')
  })
})
