import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { NotesShell } from '@/components/features/notes/NotesShell'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

const mockRouterPush = jest.fn()
const mockWordPressGetStatus = jest.fn()
const mockApiKeysGetStatus = jest.fn()
const mockSearchFocusInput = jest.fn()
const mockMaybeSingle = jest.fn()

const note = {
  id: 'note-1',
  title: 'Travel note',
  description: '<p>Body</p>',
  content: '<p>Body</p>',
  tags: ['travel', 'Work'],
  created_at: '2025-01-01T10:00:00.000Z',
  updated_at: '2025-01-01T10:00:00.000Z',
  user_id: 'user-1',
}

const fetchedNote = { ...note, id: 'note-remote', title: 'Remote note' }

type MockSidebarProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode
  onCreateNote: () => void
  onOpenSearch: () => void
  onOpenSettings: () => void
  onSignOut: () => void
}

type MockNoteListProps = {
  notes: Array<typeof note>
  isLoading: boolean
  onLoadMore: () => void
  onSelectNote: (selectedNote: typeof note) => void
  onToggleSelect: (selectedNote: typeof note) => void
}

type MockNoteViewProps = {
  note: typeof note
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onTagClick: (tag: string) => void
  onRemoveTag: (tag: string) => void
}

type MockNoteEditorProps = {
  initialTitle: string
  initialTags: string
  availableTags: string[]
  pendingChunkFocus: { requestId: string } | null
  onSave: () => void
  onAutoSave: (value: { title: string }) => void
  onBack: () => void
  onPendingChunkFocusApplied: (requestId: string) => void
}

type MockSearchResultsPanelProps = {
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  onClose: () => void
}

type MockDialogProps = {
  children: React.ReactNode
}

type MockAlertDialogProps = MockDialogProps & { open: boolean }
type MockAlertDialogActionProps = MockDialogProps & { onClick: () => void }

type NoteEditorRef = { flushPendingSave: () => Promise<void> }

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({ getStatus: mockWordPressGetStatus })),
}))

jest.mock('@core/services/apiKeysSettings', () => ({
  ApiKeysSettingsService: jest.fn().mockImplementation(() => ({ getStatus: mockApiKeysGetStatus })),
}))

jest.mock('@ui/web/lib/settingsNavigationState', () => ({
  saveSettingsReturnState: jest.fn(),
}))

jest.mock('@ui/web/lib/aiIndexNavigationState', () => ({
  consumeActiveSettingsNoteReturnPath: jest.fn(),
}))

const mockSaveSettingsReturnState = jest.requireMock<typeof import('@ui/web/lib/settingsNavigationState')>('@ui/web/lib/settingsNavigationState').saveSettingsReturnState as jest.Mock
const mockConsumeReturnPath = jest.requireMock<typeof import('@ui/web/lib/aiIndexNavigationState')>('@ui/web/lib/aiIndexNavigationState').consumeActiveSettingsNoteReturnPath as jest.Mock

jest.mock('@/components/features/notes/Sidebar', () => ({
  Sidebar: ({ children, onCreateNote, onOpenSearch, onOpenSettings, onSignOut }: MockSidebarProps) => (
    <section data-testid="mock-sidebar">
      <button type="button" onClick={onCreateNote}>Create note</button>
      <button type="button" onClick={onOpenSearch}>Open search</button>
      <button type="button" onClick={onOpenSettings}>Open settings</button>
      <button type="button" onClick={onSignOut}>Sign out</button>
      {children}
    </section>
  ),
}))

jest.mock('@/components/features/notes/NoteList', () => ({
  NoteList: ({
    notes,
    isLoading,
    onLoadMore,
    onSelectNote,
    onToggleSelect,
  }: MockNoteListProps) => (
    <div data-testid="mock-note-list">
      <span>{isLoading ? 'Loading notes' : `${notes.length} notes`}</span>
      {notes.map((item: typeof note) => (
        <button key={item.id} type="button" onClick={() => onSelectNote(item)}>{item.title}</button>
      ))}
      {notes[0] ? <button type="button" onClick={() => onToggleSelect(notes[0])}>Toggle selection</button> : null}
      <button type="button" onClick={onLoadMore}>Load more</button>
    </div>
  ),
}))

jest.mock('@/components/features/notes/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">No note selected</div>,
}))

jest.mock('@/components/features/notes/NoteView', () => ({
  NoteView: ({ note: selected, onBack, onEdit, onDelete, onTagClick, onRemoveTag }: MockNoteViewProps) => (
    <div data-testid="mock-note-view">
      <span>{selected.title}</span>
      <button type="button" onClick={onEdit}>Edit visible note</button>
      <button type="button" onClick={onDelete}>Delete visible note</button>
      <button type="button" onClick={() => onTagClick('travel')}>Filter tag</button>
      <button type="button" onClick={() => onRemoveTag('travel')}>Remove tag</button>
      <button type="button" onClick={onBack}>Back from note</button>
    </div>
  ),
}))

jest.mock('@/components/features/notes/NoteEditor', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockNoteEditor = ReactModule.forwardRef<NoteEditorRef, MockNoteEditorProps>((props, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({ flushPendingSave: jest.fn().mockResolvedValue(undefined) }))
    const pendingChunkFocus = props.pendingChunkFocus
    return (
      <div data-testid="mock-note-editor">
        <span>{props.initialTitle}</span>
        <span>{props.initialTags}</span>
        <span>{props.availableTags.join(',')}</span>
        <button type="button" onClick={() => props.onSave()}>Save edited note</button>
        <button type="button" onClick={() => props.onAutoSave({ title: 'Autosaved' })}>Autosave edited note</button>
        <button type="button" onClick={props.onBack}>Back from editor</button>
        {pendingChunkFocus ? (
          <button
            type="button"
            onClick={() => props.onPendingChunkFocusApplied(pendingChunkFocus.requestId)}
          >
            Apply pending focus
          </button>
        ) : null}
        <span>{pendingChunkFocus ? 'Pending focus' : 'No pending focus'}</span>
      </div>
    )
  })
  MockNoteEditor.displayName = 'MockNoteEditor'
  return { NoteEditor: MockNoteEditor }
})

jest.mock('@/components/features/notes/SearchResultsPanel', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockSearchResultsPanel = ReactModule.forwardRef<
    { focusInput: () => void },
    MockSearchResultsPanelProps
  >((props, ref) => {
    ReactModule.useImperativeHandle(ref, () => ({ focusInput: mockSearchFocusInput }))
    return (
      <div data-testid="mock-search-panel">
        <button type="button" onClick={() => props.onOpenInContext('note-1', 4, 8)}>Open existing context</button>
        <button type="button" onClick={() => props.onOpenInContext('note-remote', 2, 3)}>Open remote context</button>
        <button type="button" onClick={() => props.onOpenInContext('note-missing', 1, 1)}>Open missing context</button>
        <button type="button" onClick={props.onClose}>Close search</button>
      </div>
    )
  })
  MockSearchResultsPanel.displayName = 'MockSearchResultsPanel'
  return { SearchResultsPanel: MockSearchResultsPanel }
})

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: MockAlertDialogProps) => open ? <div role="dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: MockDialogProps) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: MockDialogProps) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: MockDialogProps) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: MockDialogProps) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: MockDialogProps) => <p>{children}</p>,
  AlertDialogCancel: ({ children }: MockDialogProps) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: MockAlertDialogActionProps) => <button type="button" onClick={onClick}>{children}</button>,
}))

function makeController(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', email: 'user@example.com' },
    notes: [note],
    notesQuery: {
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    },
    notesDisplayed: 1,
    notesTotal: 1,
    selectionMode: false,
    selectedCount: 0,
    selectedNoteIds: new Set<string>(),
    bulkDeleting: false,
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
    selectedNote: null,
    isEditing: false,
    saving: false,
    autoSaving: false,
    lastSavedAt: null,
    deleteDialogOpen: false,
    noteToDelete: null,
    isSearchPanelOpen: false,
    exitSelectionMode: jest.fn(),
    selectAllVisible: jest.fn(),
    deleteSelectedNotes: jest.fn(),
    filterByTag: jest.fn(),
    handleClearTagFilter: jest.fn(),
    handleCreateNote: jest.fn(),
    handleSignOut: jest.fn(),
    handleSelectNote: jest.fn().mockResolvedValue(undefined),
    handleEditNote: jest.fn().mockResolvedValue(undefined),
    toggleNoteSelection: jest.fn(),
    handleTagClick: jest.fn(),
    setIsSearchPanelOpen: jest.fn(),
    registerNoteEditorRef: jest.fn(),
    captureSettingsReturnState: jest.fn().mockResolvedValue({ selectedNoteId: 'note-1' }),
    handleSaveNote: jest.fn(),
    handleReadNote: jest.fn(),
    handleAutoSave: jest.fn(),
    handleDeleteNote: jest.fn(),
    handleRemoveTagFromNote: jest.fn(),
    confirmDeleteNote: jest.fn(),
    setDeleteDialogOpen: jest.fn(),
    ...overrides,
  }
}

function renderShell(controller = makeController()) {
  return render(<NotesShell controller={controller as never} />)
}

describe('NotesShell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue({ push: mockRouterPush } as never)
    jest.mocked(useSupabase).mockReturnValue({
      supabase: {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
          })),
        })),
      } as never,
      user: null,
      loading: false,
    })
    mockWordPressGetStatus.mockResolvedValue({ configured: true, integration: null })
    mockApiKeysGetStatus.mockResolvedValue({ gemini: { configured: true } })
    jest.mocked(useQuery).mockReturnValue({ data: { gemini: { configured: true } } } as never)
    mockConsumeReturnPath.mockReturnValue(null)
    mockMaybeSingle.mockResolvedValue({ data: fetchedNote })
  })

  it('renders the empty editor, registers the editor ref, and wires list actions', async () => {
    const controller = makeController()
    renderShell(controller)

    expect(screen.getByTestId('empty-state')).toBeTruthy()
    expect(screen.getByText('1 notes')).toBeTruthy()
    expect(controller.registerNoteEditorRef).toHaveBeenCalledWith(expect.any(Object))
    await waitFor(() => expect(mockWordPressGetStatus).toHaveBeenCalledTimes(1))
    expect(mockApiKeysGetStatus).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Travel note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(controller.handleSelectNote).toHaveBeenCalledWith(note)
    expect(controller.toggleNoteSelection).toHaveBeenCalledWith('note-1')
    expect(controller.notesQuery.fetchNextPage).toHaveBeenCalled()
    expect(controller.handleCreateNote).toHaveBeenCalled()
    expect(controller.handleSignOut).toHaveBeenCalled()
  })

  it('renders a selected note and routes its callbacks, back action, and delete confirmation', async () => {
    const controller = makeController({
      selectedNote: note,
      deleteDialogOpen: true,
      noteToDelete: note,
    })
    renderShell(controller)

    expect(screen.getByTestId('mock-note-view')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Delete Note' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit visible note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete visible note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Filter tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back from note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(controller.handleEditNote).toHaveBeenCalledWith(note)
    expect(controller.handleDeleteNote).toHaveBeenCalledWith(note)
    expect(controller.handleTagClick).toHaveBeenCalledWith('travel')
    expect(controller.handleRemoveTagFromNote).toHaveBeenCalledWith('note-1', 'travel')
    expect(controller.handleSelectNote).toHaveBeenCalledWith(null)
    expect(controller.confirmDeleteNote).toHaveBeenCalled()
    await waitFor(() => expect(mockWordPressGetStatus).toHaveBeenCalled())
  })

  it('passes editing state and pending chunk focus through the editor', async () => {
    const controller = makeController({ selectedNote: note, isEditing: true })
    renderShell(controller)

    expect(screen.getByTestId('mock-note-editor')).toBeTruthy()
    const editor = within(screen.getByTestId('mock-note-editor'))
    expect(editor.getByText('Travel note')).toBeTruthy()
    expect(editor.getByText('travel, Work')).toBeTruthy()
    expect(editor.getByText('travel,work')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save edited note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Autosave edited note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back from editor' }))

    expect(controller.handleSaveNote).toHaveBeenCalled()
    expect(controller.handleAutoSave).toHaveBeenCalledWith({ title: 'Autosaved' })
    expect(controller.handleSelectNote).toHaveBeenCalledWith(null)
  })

  it('opens search, focuses an already open panel, and handles settings navigation', async () => {
    const closedController = makeController()
    const closedView = renderShell(closedController)
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
    expect(closedController.setIsSearchPanelOpen).toHaveBeenCalledWith(true)
    closedView.unmount()

    const openController = makeController({ isSearchPanelOpen: true })
    renderShell(openController)
    fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
    expect(mockSearchFocusInput).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/settings'))
    expect(mockSaveSettingsReturnState).toHaveBeenCalledWith(expect.objectContaining({
      returnPath: expect.any(String),
      notesUiState: { selectedNoteId: 'note-1' },
    }))
  })

  it('opens an existing search result in context and clears applied focus', async () => {
    const controller = makeController({ selectedNote: note, isEditing: true, isSearchPanelOpen: true })
    renderShell(controller)

    fireEvent.click(screen.getByRole('button', { name: 'Open existing context' }))
    await waitFor(() => expect(screen.getByText('Pending focus')).toBeTruthy())
    expect(controller.handleEditNote).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Apply pending focus' }))
    expect(await screen.findByText('No pending focus')).toBeTruthy()
  })

  it('fetches a missing note for context and ignores missing or failed responses', async () => {
    const controller = makeController({ notes: [], isSearchPanelOpen: true })
    renderShell(controller)

    fireEvent.click(screen.getByRole('button', { name: 'Open remote context' }))
    await waitFor(() => expect(controller.handleEditNote).toHaveBeenCalledWith(fetchedNote))

    mockMaybeSingle.mockResolvedValueOnce({ data: null })
    fireEvent.click(screen.getByRole('button', { name: 'Open missing context' }))
    await waitFor(() => expect(mockMaybeSingle).toHaveBeenCalledTimes(2))
    expect(controller.handleEditNote).toHaveBeenCalledTimes(1)

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockMaybeSingle.mockRejectedValueOnce(new Error('database unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Open missing context' }))
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch note for open-in-context',
      expect.objectContaining({ noteId: 'note-missing' }),
    ))
    consoleError.mockRestore()
  })

  it('routes back to a saved settings path and swallows a failed normal back action', async () => {
    const settingsController = makeController({ selectedNote: note })
    mockConsumeReturnPath.mockReturnValueOnce('/settings?tab=ai-index')
    const settingsView = renderShell(settingsController)
    fireEvent.click(screen.getByRole('button', { name: 'Back from note' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/settings?tab=ai-index')
    settingsView.unmount()

    const failedBack = jest.fn().mockRejectedValue(new Error('selection failed'))
    const failedController = makeController({ selectedNote: note, handleSelectNote: failedBack })
    renderShell(failedController)
    fireEvent.click(screen.getByRole('button', { name: 'Back from note' }))
    await waitFor(() => expect(failedBack).toHaveBeenCalledWith(null))
  })
})
