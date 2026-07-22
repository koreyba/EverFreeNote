import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { NoteList } from '@/components/features/notes/NoteList'
import type { Note, SearchResult } from '@core/types/domain'

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => <span data-testid="loader" className={className} />,
  Zap: () => <span data-testid="zap" />,
}))

jest.mock('@/components/NoteListSkeleton', () => ({
  NoteListSkeleton: ({ count }: { count: number }) => <div data-testid="skeleton">{count} skeleton rows</div>,
}))

jest.mock('@/components/features/notes/NoteCard', () => ({
  NoteCard: ({
    note,
    isSelected,
    selectionMode,
    onClick,
    onToggleSelect,
    onTagClick,
  }: {
    note: { id: string; title: string }
    isSelected?: boolean
    selectionMode?: boolean
    onClick: () => void
    onToggleSelect?: () => void
    onTagClick?: (tag: string) => void
  }) => (
    <div data-testid={`note-card-${note.id}`} data-selected={isSelected ? 'true' : 'false'} data-selection-mode={selectionMode ? 'true' : 'false'}>
      <button type="button" onClick={onClick}>{note.title}</button>
      {onToggleSelect && <button type="button" onClick={onToggleSelect}>Toggle {note.id}</button>}
      {onTagClick && <button type="button" onClick={() => onTagClick('important')}>Tag {note.id}</button>}
    </div>
  ),
}))

jest.mock('react-window', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  return {
    List: ({
      rowCount,
      rowComponent: RowComponent,
      rowProps,
      onRowsRendered,
    }: {
      rowCount: number
      rowComponent: React.ComponentType<Record<string, unknown>>
      rowProps: Record<string, unknown>
      onRowsRendered?: (info: { stopIndex: number }) => void
    }) => {
      ReactModule.useEffect(() => {
        onRowsRendered?.({ stopIndex: rowCount - 1 })
      }, [onRowsRendered, rowCount])
      return (
        <div data-testid="virtual-list">
          {Array.from({ length: rowCount }, (_, index) => (
            <RowComponent
              key={index}
              index={index}
              style={{}}
              ariaAttributes={{ 'aria-posinset': index + 1, 'aria-setsize': rowCount, role: 'listitem' }}
              {...rowProps}
            />
          ))}
        </div>
      )
    },
    useDynamicRowHeight: () => 140,
  }
})

jest.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) => (
    <div data-testid="auto-sizer">{children({ height: 400, width: 600 })}</div>
  ),
}))

function makeNote(id: string, title = id): Note {
  return {
    id,
    user_id: 'user-1',
    title,
    description: '',
    tags: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  }
}

function makeSearchResult(id: string, title = id): SearchResult {
  return { ...makeNote(id, title), rank: 0.8, headline: `Headline for ${title}` }
}

function renderList(overrides: Partial<React.ComponentProps<typeof NoteList>> = {}) {
  const onToggleSelect = jest.fn()
  const onSelectNote = jest.fn()
  const onTagClick = jest.fn()
  const onLoadMore = jest.fn()
  const onLoadMoreFts = jest.fn()
  const onSearchResultClick = jest.fn()
  const view = render(
    <NoteList
      notes={[makeNote('note-1', 'First'), makeNote('note-2', 'Second')]}
      isLoading={false}
      onToggleSelect={onToggleSelect}
      onSelectNote={onSelectNote}
      onTagClick={onTagClick}
      onLoadMore={onLoadMore}
      hasMore={false}
      isFetchingNextPage={false}
      onLoadMoreFts={onLoadMoreFts}
      onSearchResultClick={onSearchResultClick}
      height={420}
      width={640}
      {...overrides}
    />,
  )
  return { ...view, onToggleSelect, onSelectNote, onTagClick, onLoadMore, onLoadMoreFts, onSearchResultClick }
}

describe('NoteList', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders regular virtualized rows and forwards select, selection, and tag actions', () => {
    const { onSelectNote, onToggleSelect, onTagClick } = renderList({
      selectedNoteId: 'note-1',
      selectedIds: new Set(['note-2']),
    })

    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle note-2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tag note-1' }))

    expect(onSelectNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1' }))
    expect(onToggleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-2' }))
    expect(onTagClick).toHaveBeenCalledWith('important')
    expect(screen.getByTestId('note-card-note-1').getAttribute('data-selected')).toBe('true')
  })

  it('uses selection-mode clicks for note rows and the fixed-size and AutoSizer paths', () => {
    const { onToggleSelect } = renderList({
      selectionMode: true,
      selectedIds: new Set(['note-1']),
      height: undefined,
      width: undefined,
    })

    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    expect(onToggleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'note-1' }))
    expect(screen.getByTestId('auto-sizer')).toBeTruthy()
    expect(screen.getByTestId('note-card-note-1').getAttribute('data-selection-mode')).toBe('true')
  })

  it('renders loading and empty regular-list states', () => {
    renderList({ isLoading: true, notes: [] })
    expect(screen.getByTestId('skeleton').textContent).toContain('5 skeleton rows')

    cleanup()
    renderList({ isLoading: false, notes: [] })
    expect(screen.getByText('No notes yet')).toBeTruthy()
    expect(screen.getByText('Create your first note to get started!')).toBeTruthy()
  })

  it('shows pagination affordances and automatically requests more rows near the end', async () => {
    const { onLoadMore } = renderList({ hasMore: true })

    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Load more...' }))
    expect(onLoadMore).toHaveBeenCalledTimes(2)

    cleanup()
    renderList({ hasMore: true, isFetchingNextPage: true })
    expect(screen.getAllByTestId('loader').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Load more...' })).toBeNull()
  })

  it('renders initial FTS loading and no-result states', () => {
    renderList({ notes: [], ftsQuery: 'abc', ftsLoading: true })
    expect(screen.getByText('Searching notes...')).toBeTruthy()

    cleanup()
    renderList({ showFTSResults: true, ftsData: { results: [] }, ftsQuery: 'abc' })
    expect(screen.getByText(/Found:/).textContent).toContain('0 notes')
    expect(screen.getByText('No results found.')).toBeTruthy()
  })

  it('renders FTS results, custom header, row callbacks, and FTS pagination', async () => {
    const { onLoadMoreFts, onSearchResultClick, onToggleSelect, onTagClick } = renderList({
      showFTSResults: true,
      ftsQuery: 'needle',
      ftsData: {
        total: 1,
        executionTime: 12,
        results: [makeSearchResult('result-1', 'Result one')],
      },
      ftsHasMore: true,
      ftsLoadingMore: false,
    })

    expect(screen.getByText(/Found:/).textContent).toContain('Found:')
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText(/Found:/).textContent).toContain('1 note')
    expect(screen.getByText('12ms')).toBeTruthy()
    expect(screen.getByTestId('zap')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Result one' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle result-1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tag result-1' }))
    expect(onSearchResultClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'result-1' }))
    expect(onToggleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'result-1' }))
    expect(onTagClick).toHaveBeenCalledWith('important')

    await waitFor(() => expect(onLoadMoreFts).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Load more...' }))
    expect(onLoadMoreFts).toHaveBeenCalledTimes(2)

    cleanup()
    renderList({
      showFTSResults: true,
      ftsData: { results: [makeSearchResult('result-2')], total: 3 },
      ftsHasMore: true,
      ftsLoadingMore: true,
      ftsHeader: <div>Custom search header</div>,
    })
    expect(screen.getByText('Custom search header')).toBeTruthy()
    expect(screen.getAllByTestId('loader').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Load more...' })).toBeNull()
  })
})
