import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SearchResultsPanel } from '@/components/features/notes/SearchResultsPanel'
import { RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_CODE } from '@ui/web/hooks/useAIPaginatedSearch'
import { useSearchMode } from '@ui/web/hooks/useSearchMode'
import { useAIPaginatedSearch } from '@ui/web/hooks/useAIPaginatedSearch'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

const mockRouterPush = jest.fn()
const mockGetStatus = jest.fn()
const mockUpsert = jest.fn()
const mockRegisterControls = jest.fn()
const mockPrecisionSlider = jest.fn(({
  value,
  onChange,
  onCommit,
}: {
  value: number
  onChange: (value: number) => void
  onCommit: (value: number) => void
}) => (
  <div>
    <input aria-label="AI precision" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <button type="button" onClick={() => onCommit(value + 0.1)}>Save precision</button>
  </div>
))
const mockSearchMode = {
  isAIEnabled: false,
  viewMode: 'note' as 'note' | 'chunk',
  setIsAIEnabled: jest.fn(),
  setViewMode: jest.fn(),
}
const mockAIState = {
  noteGroups: [],
  chunks: [],
  aiOffset: 0,
  aiAccumulatedResults: [],
  aiAccumulatedChunks: [],
  isLoading: false,
  error: null as string | null,
  errorCode: null as string | null,
  refetch: jest.fn(),
  aiHasMore: false,
  aiLoadingMore: false,
  loadMoreAI: jest.fn(),
  resetAIResults: jest.fn(),
}

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))
jest.mock('@ui/web/hooks/useSearchMode', () => ({ useSearchMode: jest.fn() }))
jest.mock('@ui/web/hooks/useAIPaginatedSearch', () => ({
  RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_CODE: 'embedding_model_mismatch',
  useAIPaginatedSearch: jest.fn(),
}))
jest.mock('@core/services/ragSearchSettings', () => ({
  RagSearchSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockGetStatus,
    upsert: mockUpsert,
  })),
}))
jest.mock('@/components/InteractiveTag', () => ({
  __esModule: true,
  default: ({ tag, onRemove }: { tag: string; onRemove: () => void }) => (
    <button type="button" aria-label={`Remove tag ${tag}`} onClick={onRemove}>{tag}</button>
  ),
}))
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@/components/features/search/AiSearchToggle', () => ({
  AiSearchToggle: ({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) => (
    <button type="button" aria-label="AI Search" onClick={() => onChange(!enabled)}>{enabled ? 'AI on' : 'AI off'}</button>
  ),
}))
jest.mock('@/components/features/search/AiSearchViewTabs', () => ({
  AiSearchViewTabs: ({ value, onChange }: { value: 'note' | 'chunk'; onChange: (value: 'note' | 'chunk') => void }) => (
    <button type="button" aria-label="AI view" onClick={() => onChange(value === 'note' ? 'chunk' : 'note')}>{value}</button>
  ),
}))
jest.mock('@/components/features/search/AiSearchPrecisionSlider', () => ({
  AiSearchPrecisionSlider: (props: Parameters<typeof mockPrecisionSlider>[0]) => mockPrecisionSlider(props),
}))
jest.mock('@/components/features/search/NoteSearchResults', () => ({
  NoteSearchResults: ({ onLoadMore }: { onLoadMore: () => void }) => (
    <div data-testid="ai-note-results"><button type="button" onClick={onLoadMore}>Load AI results</button></div>
  ),
}))
jest.mock('@/components/features/search/ChunkSearchResults', () => ({
  ChunkSearchResults: ({ onLoadMore }: { onLoadMore: () => void }) => (
    <div data-testid="ai-chunk-results"><button type="button" onClick={onLoadMore}>Load AI chunks</button></div>
  ),
}))
jest.mock('@/components/features/notes/NoteList', () => ({
  NoteList: ({
    notes,
    ftsData,
    isLoading,
    onLoadMore,
    onLoadMoreFts,
    onToggleSelect,
    onSelectNote,
  }: {
    notes: Array<{ id: string; title?: string }>
    ftsData?: { results: Array<{ id: string; title?: string }> }
    isLoading: boolean
    onLoadMore: () => void
    onLoadMoreFts?: () => void
    onToggleSelect: (note: { id: string }) => void
    onSelectNote: (note: { id: string }) => void
  }) => {
    const visibleNotes = ftsData?.results ?? notes
    return (
      <div data-testid="note-list">
        <span>{isLoading ? 'Loading notes' : `${visibleNotes.length} notes`}</span>
        {visibleNotes.map((note) => (
          <button key={note.id} type="button" onClick={() => onSelectNote(note)}>{note.title ?? note.id}</button>
        ))}
        {visibleNotes[0] ? <button type="button" onClick={() => onToggleSelect(visibleNotes[0])}>Toggle first</button> : null}
        <button type="button" onClick={onLoadMore}>Load more</button>
        {onLoadMoreFts ? <button type="button" onClick={onLoadMoreFts}>Load more FTS</button> : null}
      </div>
    )
  },
}))

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    searchQuery: '',
    filterByTag: null,
    ftsSearchResult: { isLoading: false, refetch: jest.fn() },
    showFTSResults: false,
    ftsData: null,
    ftsHasMore: false,
    ftsLoadingMore: false,
    showTagOnlyResults: false,
    tagOnlyResults: [],
    tagOnlyTotal: 0,
    tagOnlyLoading: false,
    tagOnlyHasMore: false,
    tagOnlyLoadingMore: false,
    handleTagClick: jest.fn(),
    handleSearchResultClick: jest.fn(),
    loadMoreFts: jest.fn(),
    loadMoreTagOnly: jest.fn(),
    handleSearch: jest.fn(),
    handleClearTagFilter: jest.fn(),
    selectedNote: null,
    handleSelectNote: jest.fn(),
    registerAIPaginationControls: mockRegisterControls,
    deleteNotesByIds: jest.fn().mockResolvedValue({ failed: 0 }),
    resetFtsResults: jest.fn(),
    ...overrides,
  }
}

function renderPanel(controller = makeController(), props: { hasGeminiApiKey?: boolean } = {}) {
  return render(
    <SearchResultsPanel
      controller={controller as never}
      hasGeminiApiKey={props.hasGeminiApiKey}
      onOpenInContext={jest.fn()}
      onClose={jest.fn()}
    />,
  )
}

describe('SearchResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockSearchMode.isAIEnabled = false
    mockSearchMode.viewMode = 'note'
    mockGetStatus.mockResolvedValue({ top_k: 10, similarity_threshold: 0.75 })
    mockUpsert.mockResolvedValue({ top_k: 10, similarity_threshold: 0.85 })
    Object.assign(mockAIState, {
      noteGroups: [], chunks: [], isLoading: false, error: null, errorCode: null,
    })
    jest.mocked(useSupabase).mockReturnValue({ supabase: {} as never, user: null, loading: false })
    jest.mocked(useSearchMode).mockImplementation(() => mockSearchMode)
    jest.mocked(useAIPaginatedSearch).mockImplementation(() => mockAIState)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the empty state, debounces search, handles Enter/clear, and closes', () => {
    jest.useFakeTimers()
    const controller = makeController()
    const onClose = jest.fn()
    render(
      <SearchResultsPanel controller={controller as never} hasGeminiApiKey={false} onOpenInContext={jest.fn()} onClose={onClose} />,
    )
    const input = screen.getByTestId('search-panel-input')
    expect(screen.getByText('Search your notes')).toBeTruthy()

    fireEvent.change(input, { target: { value: '  travel  ' } })
    expect(controller.handleSearch).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(250))
    expect(controller.handleSearch).toHaveBeenCalledWith('  travel  ')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(controller.handleSearch).toHaveBeenLastCalledWith('travel')
    fireEvent.click(screen.getByTestId('search-panel-clear'))
    expect(controller.handleSearch).toHaveBeenLastCalledWith('')
    expect(mockAIState.resetAIResults).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('search-panel-close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders FTS results and supports tag-only pagination and panel selection', async () => {
    const controller = makeController({
      searchQuery: 'travel',
      showFTSResults: true,
      ftsData: { total: 1, executionTime: 12, results: [{ id: 'note-1', title: 'FTS note' }] },
    })
    const ftsView = renderPanel(controller, { hasGeminiApiKey: false })
    expect(screen.getByTestId('search-results-header').textContent).toContain('Found: 1 note')
    expect(screen.getByText('12ms')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle first' }))
    expect(screen.getByTestId('selection-mode-count').textContent).toContain('1')
    fireEvent.click(screen.getByTestId('selection-mode-select-all'))
    expect(screen.getByTestId('selection-mode-count').textContent).toContain('1')

    fireEvent.click(screen.getByTestId('selection-mode-cancel'))
    expect(screen.queryByTestId('selection-mode-actions')).toBeNull()
    ftsView.unmount()

    const tagController = makeController({
      showTagOnlyResults: true,
      tagOnlyTotal: 2,
      tagOnlyResults: [{ id: 'tag-1', title: 'Tagged note' }],
      tagOnlyHasMore: true,
    })
    renderPanel(tagController, { hasGeminiApiKey: false })
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(tagController.loadMoreTagOnly).toHaveBeenCalled()
    expect(screen.getByTestId('search-results-header').textContent).toContain('Found: 2 notes')
  })

  it('shows AI loading, generic retry, and embedding mismatch reindex actions', async () => {
    mockSearchMode.isAIEnabled = true
    mockAIState.isLoading = true
    const controller = makeController({ searchQuery: 'semantic' })
    const loadingView = renderPanel(controller)
    expect(screen.getByTestId('search-results-header').textContent).toContain('Found: 0 notes')
    expect(screen.getAllByTestId('search-results-panel')[0].querySelectorAll('.animate-pulse')).toHaveLength(9)

    loadingView.unmount()
    mockAIState.isLoading = false
    mockAIState.error = 'AI backend unavailable'
    const view = renderPanel(controller)
    expect(await screen.findByText('AI Search unavailable')).toBeTruthy()
    fireEvent.click(screen.getByTestId('search-panel-ai-retry'))
    expect(mockAIState.refetch).toHaveBeenCalled()
    view.unmount()

    mockAIState.error = 'Embeddings need rebuilding'
    mockAIState.errorCode = RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_CODE
    const onClose = jest.fn()
    render(
      <SearchResultsPanel controller={controller as never} onOpenInContext={jest.fn()} onClose={onClose} />,
    )
    expect(await screen.findByText('Embeddings need rebuilding')).toBeTruthy()
    fireEvent.click(screen.getByTestId('search-panel-ai-reindex'))
    expect(mockRouterPush).toHaveBeenCalledWith('/settings?tab=ai-index')
    expect(onClose).toHaveBeenCalled()
  })

  it('ignores a late settings response after unmount and still saves a live response', async () => {
    mockSearchMode.isAIEnabled = true
    let resolvePending: ((settings: { top_k: number; similarity_threshold: number }) => void) | undefined
    const pending = new Promise<{ top_k: number; similarity_threshold: number }>((resolve) => {
      resolvePending = resolve
    })
    mockGetStatus.mockReturnValueOnce(pending)
    const firstView = renderPanel(makeController({ searchQuery: 'semantic' }), { hasGeminiApiKey: true })
    await waitFor(() => expect(mockGetStatus).toHaveBeenCalledTimes(1))
    const precisionSliderRendersBeforeUnmount = mockPrecisionSlider.mock.calls.length
    expect(precisionSliderRendersBeforeUnmount).toBeGreaterThan(0)
    firstView.unmount()
    await act(async () => {
      resolvePending?.({ top_k: 10, similarity_threshold: 0.9 })
      await pending
    })
    expect(mockPrecisionSlider).toHaveBeenCalledTimes(precisionSliderRendersBeforeUnmount)

    mockGetStatus.mockResolvedValueOnce({ top_k: 10, similarity_threshold: 0.7 })
    mockAIState.error = null
    renderPanel(makeController({ searchQuery: 'semantic' }), { hasGeminiApiKey: true })
    await waitFor(() => expect(mockGetStatus).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('button', { name: 'Save precision' })).toBeTruthy()
    await waitFor(() => expect((screen.getByLabelText('AI precision') as HTMLInputElement).value).toBe('0.7'))
    fireEvent.click(screen.getByRole('button', { name: 'Save precision' }))
    await waitFor(() => expect(mockUpsert).toHaveBeenCalledWith({ similarity_threshold: 0.8 }))
  })

  it('cleans resize listeners and cursor state on unmount', () => {
    const { unmount } = renderPanel(makeController(), { hasGeminiApiKey: false })
    const resizeHandle = screen.getByTestId('search-results-panel').querySelector('.cursor-col-resize')
    expect(resizeHandle).not.toBeNull()
    fireEvent.pointerDown(resizeHandle!, { clientX: 100 })
    expect(document.body.style.cursor).toBe('col-resize')
    unmount()
    expect(document.body.style.cursor).toBe('')
  })
})
