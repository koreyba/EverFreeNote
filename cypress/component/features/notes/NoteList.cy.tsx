import React from 'react'
import { NoteList } from '@/components/features/notes/NoteList'
import type { SearchResult } from '@/types/domain'

describe('NoteList FTS header', () => {
  const getBaseProps = () => ({
    notes: [],
    isLoading: false,
    onSelectNote: cy.stub(),
    onToggleSelect: cy.stub(),
    onTagClick: cy.stub(),
    onLoadMore: cy.stub(),
    hasMore: false,
    isFetchingNextPage: false,
    ftsQuery: 'test',
    ftsLoading: false,
    ftsHasMore: false,
    ftsLoadingMore: false,
    onLoadMoreFts: cy.stub(),
    onSearchResultClick: cy.stub(),
  })

  const mockResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    id: '1',
    title: 'Result',
    description: '',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user1',
    rank: 0.5,
    headline: '',
    ...overrides,
  })

  it('uses server total when provided', () => {
    const ftsData = {
      total: 50,
      executionTime: 123,
      results: [mockResult()],
    }

    cy.mount(
      <NoteList
        {...getBaseProps()}
        showFTSResults
        ftsData={ftsData}
      />
    )

    cy.contains('Found: 50').should('be.visible')
  })

  it('falls back to loaded count when total is unknown', () => {
    const ftsData = {
      total: undefined,
      executionTime: 123,
      results: [mockResult(), mockResult({ id: '2' })],
    }

    cy.mount(
      <NoteList
        {...getBaseProps()}
        showFTSResults
        ftsData={ftsData}
      />
    )

    cy.contains('Found: 2').should('be.visible')
  })
})
