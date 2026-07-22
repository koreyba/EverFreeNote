import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ExportButton } from '@/components/ExportButton'
import { toast } from 'sonner'

const mockGetUser = jest.fn()
const mockGetNotes = jest.fn()
const mockExportNotes = jest.fn()
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: { auth: { getUser: mockGetUser } } }),
}))

jest.mock('@/components/ExportSelectionDialog', () => ({
  ExportSelectionDialog: ({
    open,
    onExport,
    onOpenChange,
  }: {
    open: boolean
    onExport: (selection: { selectAll: boolean; selectedIds: string[]; deselectedIds: string[]; totalCount: number }) => void
    onOpenChange: (open: boolean) => void
  }) => open ? (
    <div data-testid="selection-dialog">
      <button onClick={() => onExport({ selectAll: false, selectedIds: ['note-1'], deselectedIds: [], totalCount: 1 })}>
        Export selected
      </button>
      <button onClick={() => onExport({ selectAll: true, selectedIds: [], deselectedIds: ['note-2'], totalCount: 3 })}>
        Export all
      </button>
      <button onClick={() => onOpenChange(false)}>Close selection</button>
    </div>
  ) : null,
}))

jest.mock('@/components/ExportProgressDialog', () => ({
  ExportProgressDialog: ({ open, progress, onClose }: { open: boolean; progress: { message: string }; onClose: () => void }) => open ? (
    <div data-testid="progress-dialog">
      <span>{progress.message}</span>
      <button onClick={onClose}>Close progress</button>
    </div>
  ) : null,
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({ getNotes: mockGetNotes })),
}))
jest.mock('@core/enex/export-service', () => ({
  ExportService: jest.fn().mockImplementation(() => ({ exportNotes: mockExportNotes })),
}))
jest.mock('@core/enex/image-downloader', () => ({ ImageDownloader: jest.fn() }))
jest.mock('@core/enex/enex-builder', () => ({ EnexBuilder: jest.fn() }))

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetNotes.mockResolvedValue({ notes: [{ id: 'note-1' }], hasMore: false })
    mockExportNotes.mockResolvedValue({ blob: new Blob(['enex']), fileName: 'notes.enex' })
    mockCreateObjectURL.mockReturnValue('blob:test-url')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: mockCreateObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: mockRevokeObjectURL })
  })

  afterEach(() => {
    jest.useRealTimers()
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL')
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })

  it('exports selected notes, reports success, and cleans up the download URL timer', async () => {
    const onExportComplete = jest.fn()
    jest.useFakeTimers()
    render(<ExportButton onExportComplete={onExportComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Export .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export selected' }))

    await waitFor(() => expect(mockExportNotes).toHaveBeenCalledWith(
      ['note-1'],
      'user-1',
      expect.any(Function),
    ))
    expect(toast.success).toHaveBeenCalledWith('Exported 1 notes')
    expect(onExportComplete).toHaveBeenCalledWith(true, 1)
    expect(screen.getByRole('button', { name: 'Export .enex file' })).toBeTruthy()

    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('fetches all pages, removes deselected ids, and exports the remaining notes', async () => {
    mockGetNotes
      .mockResolvedValueOnce({ notes: [{ id: 'note-1' }, { id: 'note-2' }], hasMore: true, nextCursor: 4 })
      .mockResolvedValueOnce({ notes: [{ id: 'note-3' }], hasMore: false })
    render(<ExportButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Export .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export all' }))

    await waitFor(() => expect(mockGetNotes).toHaveBeenNthCalledWith(2, 'user-1', { page: 4, pageSize: 200 }))
    expect(mockExportNotes).toHaveBeenCalledWith(['note-1', 'note-3'], 'user-1', expect.any(Function))
  })

  it('reports unauthenticated and export failures and restores the idle state', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const onExportComplete = jest.fn()
    render(<ExportButton onExportComplete={onExportComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export .enex file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export selected' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You need to sign in to export notes'))
    expect(mockExportNotes).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Export .enex file' })).toBeTruthy()

    mockExportNotes.mockRejectedValueOnce(new Error('builder failed'))
    fireEvent.click(screen.getByRole('button', { name: 'Export selected' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to export notes'))
    expect(onExportComplete).toHaveBeenCalledWith(false, 0)
    expect(await screen.findByText('Export completed with errors')).toBeTruthy()
  })
})
