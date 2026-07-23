import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NoteSearchResults } from '@ui/web/components/features/search/NoteSearchResults'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

function makeChunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    noteId: 'note-1',
    noteTitle: 'First Note Title',
    noteTags: ['react', 'testing'],
    chunkIndex: 0,
    charOffset: 10,
    bodyContent: 'First chunk body content',
    overlapPrefix: '',
    content: 'First chunk body content',
    similarity: 0.92,
    ...overrides,
  }
}

function makeGroup(overrides: Partial<RagNoteGroup> = {}): RagNoteGroup {
  return {
    noteId: 'note-1',
    noteTitle: 'First Note Title',
    noteTags: ['react', 'testing'],
    topScore: 0.92,
    chunks: [makeChunk()],
    hiddenCount: 0,
    ...overrides,
  }
}

describe('NoteSearchResults', () => {
  const mockOnOpenInContext = jest.fn()
  const mockOnTagClick = jest.fn()
  const mockOnToggleSelect = jest.fn()
  const mockOnLoadMore = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty Search State', () => {
    it('renders empty search state message when noteGroups array is empty', () => {
      render(
        <NoteSearchResults
          noteGroups={[]}
          onOpenInContext={mockOnOpenInContext}
        />
      )

      expect(
        screen.getByText(
          /No results\. Lower the precision slider or use the/i
        )
      ).toBeTruthy()
      expect(screen.queryByRole('list')).toBeNull()
    })
  })

  describe('Search Results List & Metadata Display', () => {
    it('renders list container with correct role and aria-label', () => {
      const groups = [makeGroup()]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
        />
      )

      const listContainer = screen.getByRole('list', { name: 'Note search results' })
      expect(listContainer).toBeTruthy()
    })

    it('renders multiple note search items with titles, metadata scores, and tags', () => {
      const groups: RagNoteGroup[] = [
        makeGroup({
          noteId: 'note-1',
          noteTitle: 'React Integration Guide',
          topScore: 0.95,
          noteTags: ['frontend', 'react'],
          chunks: [
            makeChunk({
              noteId: 'note-1',
              noteTitle: 'React Integration Guide',
              bodyContent: 'React component setup instructions',
              similarity: 0.95,
            }),
          ],
        }),
        makeGroup({
          noteId: 'note-2',
          noteTitle: 'TypeScript System Docs',
          topScore: 0.78,
          noteTags: ['typescript'],
          chunks: [
            makeChunk({
              noteId: 'note-2',
              noteTitle: 'TypeScript System Docs',
              bodyContent: 'Type definitions and compiler options',
              similarity: 0.78,
            }),
          ],
        }),
      ]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          query="search term"
        />
      )

      expect(screen.getByText('React Integration Guide')).toBeTruthy()
      expect(screen.getByText('TypeScript System Docs')).toBeTruthy()
      expect(screen.getByText('95%')).toBeTruthy()
      expect(screen.getByText('78%')).toBeTruthy()
      expect(screen.getByText('frontend')).toBeTruthy()
      expect(screen.getByText('typescript')).toBeTruthy()
      expect(screen.getByText('React component setup instructions')).toBeTruthy()
      expect(screen.getByText('Type definitions and compiler options')).toBeTruthy()
    })

    it('invokes onOpenInContext callback when clicking open fragment on a result item', () => {
      const groups = [makeGroup({ noteId: 'note-42' })]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
        />
      )

      const openButton = screen.getByRole('button', { name: /Open top fragment/i })
      fireEvent.click(openButton)

      expect(mockOnOpenInContext).toHaveBeenCalledTimes(1)
      expect(mockOnOpenInContext).toHaveBeenCalledWith('note-42', 10, expect.any(Number))
    })

    it('invokes onTagClick callback when clicking an interactive tag', () => {
      const groups = [makeGroup({ noteTags: ['architecture'] })]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          onTagClick={mockOnTagClick}
        />
      )

      const tagElement = screen.getByText('architecture')
      fireEvent.click(tagElement)

      expect(mockOnTagClick).toHaveBeenCalledTimes(1)
      expect(mockOnTagClick).toHaveBeenCalledWith('architecture')
    })
  })

  describe('Selection Mode & Callback', () => {
    it('passes selectionMode and isSelected state to result items', () => {
      const groups = [
        makeGroup({ noteId: 'note-1', noteTitle: 'Note One' }),
        makeGroup({ noteId: 'note-2', noteTitle: 'Note Two' }),
      ]
      const selectedIds = new Set(['note-1'])

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          selectionMode={true}
          selectedIds={selectedIds}
          onToggleSelect={mockOnToggleSelect}
        />
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0].getAttribute("aria-checked")).toBe("true")
      expect(checkboxes[1].getAttribute("aria-checked")).toBe("false")
    })

    it('triggers onToggleSelect callback when toggling selection on an item', () => {
      const groups = [makeGroup({ noteId: 'note-10' })]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          selectionMode={true}
          selectedIds={new Set()}
          onToggleSelect={mockOnToggleSelect}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnToggleSelect).toHaveBeenCalledTimes(1)
      expect(mockOnToggleSelect).toHaveBeenCalledWith('note-10')
    })
  })

  describe('Pagination & Load More State', () => {
    it('renders Load More button when hasMore is true and invokes onLoadMore on click', () => {
      const groups = [makeGroup()]

      render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          hasMore={true}
          loadingMore={false}
          onLoadMore={mockOnLoadMore}
        />
      )

      const loadMoreButton = screen.getByRole('button', { name: /Load more\.\.\./i })
      expect(loadMoreButton).toBeTruthy()

      fireEvent.click(loadMoreButton)
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1)
    })

    it('renders loading spinner when loadingMore is true and hides Load More button', () => {
      const groups = [makeGroup()]

      const { container } = render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          hasMore={true}
          loadingMore={true}
          onLoadMore={mockOnLoadMore}
        />
      )

      expect(screen.queryByRole('button', { name: /Load more\.\.\./i })).toBeNull()
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })

    it('does not render Load More button or spinner when hasMore is false and loadingMore is false', () => {
      const groups = [makeGroup()]

      const { container } = render(
        <NoteSearchResults
          noteGroups={groups}
          onOpenInContext={mockOnOpenInContext}
          hasMore={false}
          loadingMore={false}
          onLoadMore={mockOnLoadMore}
        />
      )

      expect(screen.queryByRole('button', { name: /Load more\.\.\./i })).toBeNull()
      expect(container.querySelector('.animate-spin')).toBeNull()
    })
  })
})
