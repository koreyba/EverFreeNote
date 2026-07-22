import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ImportButton } from '@/components/ImportButton'
import { browser } from '@ui/web/adapters/browser'
import { resolveExistingTitlesForImport } from '@core/enex/import-shared'
import { toast } from 'sonner'

const mockGetUser = jest.fn()
const mockParse = jest.fn()
const mockConvert = jest.fn()
const mockCreate = jest.fn()
const mockSupabase = { auth: { getUser: mockGetUser } }

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), warning: jest.fn() },
}))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: mockSupabase }),
}))
jest.mock('@ui/web/adapters/browser', () => ({
  browser: { localStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } },
}))
jest.mock('@/components/ImportDialog', () => ({
  ImportDialog: ({ open, onImport, onOpenChange }: {
    open: boolean
    onImport: (files: File[], settings: { duplicateStrategy: 'prefix' | 'skip' | 'replace'; skipFileDuplicates: boolean }) => void
    onOpenChange: (open: boolean) => void
  }) => open ? (
    <div data-testid="import-dialog">
      <button onClick={() => onImport([new File(['enex'], 'notes.enex')], { duplicateStrategy: 'prefix', skipFileDuplicates: false })}>
        Start import
      </button>
      <button onClick={() => onOpenChange(false)}>Close import</button>
    </div>
  ) : null,
}))
jest.mock('@/components/ImportProgressDialog', () => ({
  ImportProgressDialog: ({ open, result, onClose }: { open: boolean; result: { message: string } | null; onClose: () => void }) => open ? (
    <div data-testid="progress-dialog">
      {result && <span>{result.message}</span>}
      {result && <button onClick={onClose}>Close progress</button>}
    </div>
  ) : null,
}))
jest.mock('@core/enex/parser', () => ({ EnexParser: jest.fn().mockImplementation(() => ({ parse: mockParse })) }))
jest.mock('@core/enex/converter', () => ({ ContentConverter: jest.fn().mockImplementation(() => ({ convert: mockConvert })) }))
jest.mock('@core/enex/note-creator', () => ({ NoteCreator: jest.fn().mockImplementation(() => ({ create: mockCreate })) }))
jest.mock('@core/enex/image-processor', () => ({ ImageProcessor: jest.fn() }))
jest.mock('@core/enex/import-shared', () => ({ resolveExistingTitlesForImport: jest.fn() }))

const parsedNote = {
  title: 'Imported note',
  content: '<en-note>Content</en-note>',
  created: new Date('2024-01-01'),
  updated: new Date('2024-01-02'),
  tags: [],
  resources: [],
}

describe('ImportButton', () => {
  const mockResolveExistingTitles = jest.mocked(resolveExistingTitlesForImport)
  const mockToastError = jest.mocked(toast.error)
  const mockToastWarning = jest.mocked(toast.warning)
  const mockGetItem = jest.mocked(browser.localStorage.getItem)
  const mockSetItem = jest.mocked(browser.localStorage.setItem)
  const mockRemoveItem = jest.mocked(browser.localStorage.removeItem)

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetItem.mockReturnValue(null)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockParse.mockResolvedValue([parsedNote])
    mockConvert.mockResolvedValue('<p>Converted</p>')
    mockCreate.mockResolvedValue('note-1')
    mockResolveExistingTitles.mockResolvedValue(new Map())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reports and clears an interrupted import state on mount', () => {
    mockGetItem.mockReturnValueOnce(JSON.stringify({ successCount: 3 }))
    render(<ImportButton />)

    expect(mockToastWarning).toHaveBeenCalledWith(
      'Previous import was interrupted. 3 notes were imported before the interruption.',
      { duration: 10000 },
    )
    expect(mockRemoveItem).toHaveBeenCalledWith('everfreenote-import-state')
  })

  it('rejects oversized files before accessing the authenticated user', async () => {
    render(<ImportButton maxFileSize={1} />)
    fireEvent.click(screen.getByRole('button', { name: 'Import .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start import' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Files too large (max 0MB): notes.enex'))
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Import .enex file' })).toBeTruthy()
  })

  it('imports success, duplicate, and failed notes with partial completion counts', async () => {
    mockParse.mockResolvedValueOnce([parsedNote, { ...parsedNote, title: 'Duplicate' }, { ...parsedNote, title: 'Broken' }])
    mockConvert
      .mockResolvedValueOnce('<p>First</p>')
      .mockResolvedValueOnce('<p>Second</p>')
      .mockRejectedValueOnce(new Error('conversion failed'))
    mockCreate.mockResolvedValueOnce('note-1').mockResolvedValueOnce(null)
    const onImportComplete = jest.fn()
    render(<ImportButton onImportComplete={onImportComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Import .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start import' }))

    expect(await screen.findByText('Successfully imported 1 note, skipped 1 duplicate note, with 1 error')).toBeTruthy()
    expect(onImportComplete).toHaveBeenCalledWith('partial', { successCount: 1, errorCount: 1 })
    expect(mockSetItem).toHaveBeenCalled()
    expect(mockRemoveItem).toHaveBeenCalledWith('everfreenote-import-state')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('shows authentication and top-level import errors and removes the beforeunload handler', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    render(<ImportButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Import .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start import' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You must be logged in to import notes'))

    mockGetUser.mockRejectedValueOnce(new Error('auth unavailable'))
    fireEvent.click(screen.getByRole('button', { name: 'Import .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start import' }))
    expect(await screen.findByText('Import failed: auth unavailable')).toBeTruthy()

    const beforeUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeUnload)
    expect(beforeUnload.defaultPrevented).toBe(false)
  })
})
