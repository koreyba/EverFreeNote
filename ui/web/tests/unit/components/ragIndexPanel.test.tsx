import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { RagIndexPanel } from '@ui/web/components/features/notes/RagIndexPanel'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { useRagStatus } from '@ui/web/hooks/useRagStatus'
import { isRagDebugChunksEnabled } from '@ui/web/components/features/settings/RagIndexingSettingsPanel'
import { logRagIndexDebugChunks } from '@core/rag/debugLog'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent } from '@/components/ui/dropdown-menu'

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))

jest.mock('@ui/web/hooks/useRagStatus', () => ({
  useRagStatus: jest.fn(),
}))

jest.mock('@ui/web/components/features/settings/RagIndexingSettingsPanel', () => ({
  isRagDebugChunksEnabled: jest.fn(),
}))

jest.mock('@core/rag/debugLog', () => ({
  logRagIndexDebugChunks: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockedUseSupabase = jest.mocked(useSupabase)
const mockedUseRagStatus = jest.mocked(useRagStatus)
const mockedDebugEnabled = jest.mocked(isRagDebugChunksEnabled)
const mockedLogDebugChunks = jest.mocked(logRagIndexDebugChunks)
const mockedToast = jest.mocked(toast)

const createInvoke = (responses: Array<{ data: unknown; error: Error | null }>) => {
  const invoke = jest.fn().mockImplementation(async () => responses.shift() ?? { data: null, error: null })
  mockedUseSupabase.mockReturnValue({ supabase: { functions: { invoke } } } as ReturnType<typeof useSupabase>)
  return invoke
}

const setStatus = ({ chunkCount = 0, indexedAt = null, isLoading = false, refresh = jest.fn() } = {}) => {
  mockedUseRagStatus.mockReturnValue({ chunkCount, indexedAt, isLoading, refresh })
  return refresh
}

const debugChunk = {
  chunkIndex: 0,
  charOffset: 0,
  sectionHeading: null,
  title: 'Note title',
  content: 'content',
  bodyContent: 'body',
  overlapPrefix: null,
}

const originalResponse = globalThis.Response
class MockResponse {
  private readonly body: string

  constructor(body: string, init: { status: number }) {
    this.body = body
    void init
  }

  async json() {
    return JSON.parse(this.body) as { error?: string }
  }
}

beforeAll(() => {
  if (!originalResponse) {
    Object.defineProperty(globalThis, 'Response', { value: MockResponse, configurable: true })
  }
})

afterAll(() => {
  if (!originalResponse) delete (globalThis as { Response?: unknown }).Response
})

beforeEach(() => {
  mockedDebugEnabled.mockReturnValue(false)
  setStatus()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('RagIndexPanel', () => {
  it('indexes an unindexed note and refreshes after a successful response', async () => {
    const refresh = setStatus({ isLoading: true })
    const invoke = createInvoke([{ data: { outcome: 'indexed', chunkCount: 3 }, error: null }])

    render(<RagIndexPanel noteId="note-1" />)

    expect(screen.getByText('...')).toBeTruthy()
    const indexButton = screen.getByRole('button', { name: 'RAG Index' })
    fireEvent.click(indexButton)

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('rag-index', {
      body: { noteId: 'note-1', action: 'index' },
    }))
    await waitFor(() => expect(mockedToast.success).toHaveBeenCalledWith('Indexed into 3 chunks'))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect((indexButton as HTMLButtonElement).disabled).toBe(false)
  })

  it('reindexes with debug chunks and reports skipped or unexpected semantic outcomes', async () => {
    const refresh = setStatus({ chunkCount: 2, indexedAt: '2026-01-02T03:04:05Z' })
    mockedDebugEnabled.mockReturnValue(true)
    const invoke = createInvoke([
      { data: { outcome: 'skipped', message: 'Note is too short', debugChunks: [debugChunk] }, error: null },
      { data: { outcome: 'unknown', message: 'No chunks returned' }, error: null },
    ])
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(<RagIndexPanel noteId="note-2" />)
    expect(screen.getByText(/2 chunks/)).toBeTruthy()
    fireEvent.click(screen.getByTitle('Re-index this note'))

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('rag-index', {
      body: { noteId: 'note-2', action: 'reindex', debugChunks: true },
    }))
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Note is too short'))
    expect(mockedLogDebugChunks).toHaveBeenCalledWith('note-2', [debugChunk])

    fireEvent.click(screen.getByTitle('Re-index this note'))
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('No chunks returned'))
    expect(warn).toHaveBeenCalledWith('[rag-index] Unexpected response payload for index action', { outcome: 'unknown', message: 'No chunks returned' })
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('surfaces response errors, fallback errors, and disables delete while not indexed', async () => {
    setStatus({ chunkCount: 0 })
    const responseError = Object.assign(new Error('http failure'), {
      context: new (globalThis.Response ?? MockResponse)(JSON.stringify({ error: 'backend rejected it' }), { status: 500 }),
    })
    const invoke = createInvoke([
      { data: null, error: new Error('invoke failed') },
      { data: null, error: responseError },
    ])

    render(<RagIndexPanel noteId="note-3" />)

    const deleteButton = screen.getByRole('button', { name: 'Delete Index' }) as HTMLButtonElement
    expect(deleteButton.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'RAG Index' }))
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('invoke failed'))

    fireEvent.click(screen.getByRole('button', { name: 'RAG Index' }))
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('backend rejected it'))
  })

  it('confirms deletion, handles delete errors, and calls the menu close callback', async () => {
    const refresh = setStatus({ chunkCount: 1 })
    const onMenuClose = jest.fn()
    const invoke = createInvoke([
      { data: { outcome: 'deleted' }, error: null },
      { data: null, error: new Error('delete failed') },
    ])

    render(<RagIndexPanel noteId="note-4" onMenuClose={onMenuClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Index' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Remove from AI index?')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onMenuClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete Index' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('rag-index', {
      body: { noteId: 'note-4', action: 'delete' },
    }))
    await waitFor(() => expect(mockedToast.success).toHaveBeenCalledWith('RAG index removed'))
    expect(refresh).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete Index' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Delete Index' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('delete failed'))
  })

  it('renders the menu variant and keeps index requests open until they settle', async () => {
    let resolveInvoke: ((value: { data: unknown; error: null }) => void) | undefined
    const pending = new Promise<{ data: unknown; error: null }>((resolve) => { resolveInvoke = resolve })
    const invoke = jest.fn().mockReturnValue(pending)
    mockedUseSupabase.mockReturnValue({ supabase: { functions: { invoke } } } as ReturnType<typeof useSupabase>)
    const onMenuClose = jest.fn()
    setStatus({ chunkCount: 1 })

    render(
      <DropdownMenu open>
        <DropdownMenuContent portalled={false}>
          <RagIndexPanel noteId="note-5" variant="menu" onMenuClose={onMenuClose} />
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const menu = screen.getByRole('menu')
    expect(within(menu).getByText(/AI index: 1 chunks/)).toBeTruthy()
    const indexItem = within(menu).getByTitle('Re-index this note')
    fireEvent.click(indexItem)
    expect((indexItem as HTMLDivElement).getAttribute('data-disabled')).not.toBeNull()
    resolveInvoke?.({ data: { outcome: 'indexed', chunkCount: 4 }, error: null })
    await waitFor(() => expect(onMenuClose).toHaveBeenCalledTimes(1))
  })
})
