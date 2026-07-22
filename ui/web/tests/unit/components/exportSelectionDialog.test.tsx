import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ExportSelectionDialog } from '@/components/ExportSelectionDialog'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

const mockGetNotes = jest.fn()
const mockGetUser = jest.fn()
const mockSupabase = { auth: { getUser: mockGetUser } }

jest.mock('@ui/web/providers/SupabaseProvider', () => ({ useSupabase: jest.fn() }))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({ getNotes: mockGetNotes })),
}))

const notes = [
  {
    id: 'note-1',
    title: 'Shopping list',
    description: '<p>Buy milk</p>',
    updated_at: '2024-01-02T00:00:00.000Z',
    tags: ['home', 'errands', 'weekly', 'extra'],
  },
  {
    id: 'note-2',
    title: 'Travel plans',
    description: 'Flights and hotels',
    updated_at: '2024-01-03T00:00:00.000Z',
    tags: [],
  },
]

function renderDialog(overrides: { open?: boolean; onOpenChange?: jest.Mock; onExport?: jest.Mock } = {}) {
  return render(
    <ExportSelectionDialog
      open={overrides.open ?? true}
      onOpenChange={overrides.onOpenChange ?? jest.fn()}
      onExport={overrides.onExport ?? jest.fn()}
    />,
  )
}

function expectSelectionSummary(summary: string) {
  const summaryElement = Array.from(document.querySelectorAll('p')).find(
    (element) => element.textContent?.replace(/\s+/g, ' ') === summary,
  )
  expect(summaryElement).toBeTruthy()
}

describe('ExportSelectionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useSupabase).mockReturnValue({ supabase: mockSupabase } as never)
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetNotes.mockResolvedValue({ notes, totalCount: notes.length, hasMore: false })
  })

  it('loads notes, strips HTML descriptions, searches, selects one note, and exports it', async () => {
    const onExport = jest.fn()
    const onOpenChange = jest.fn()
    renderDialog({ onExport, onOpenChange })

    expect(await screen.findByText('Shopping list')).toBeTruthy()
    expect(screen.getByText('Buy milk')).toBeTruthy()
    expect(screen.getByText('+1')).toBeTruthy()
    expectSelectionSummary('Selected: 0 of 2')

    fireEvent.change(screen.getByPlaceholderText('Search by title or text'), {
      target: { value: 'hotel' },
    })
    expect(screen.getByText('Travel plans')).toBeTruthy()
    expect(screen.queryByText('Shopping list')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Search by title or text'), {
      target: { value: 'missing' },
    })
    expect(screen.getByText('Nothing found for "missing"')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search by title or text'), { target: { value: '' } })
    fireEvent.click(screen.getByLabelText('Select note Shopping list'))
    expectSelectionSummary('Selected: 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Export (1)' }))

    expect(onExport).toHaveBeenCalledWith({
      selectAll: false,
      selectedIds: ['note-1'],
      deselectedIds: [],
      totalCount: 2,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('selects all notes, tracks deselected notes, and clears the selection', async () => {
    const onExport = jest.fn()
    renderDialog({ onExport })
    await screen.findByText('Shopping list')

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }))
    expectSelectionSummary('Selected: 2 of 2')
    fireEvent.click(screen.getByLabelText('Select note Travel plans'))
    expectSelectionSummary('Selected: 1 of 2')

    fireEvent.click(screen.getByRole('button', { name: 'Export (1)' }))
    expect(onExport).toHaveBeenCalledWith({
      selectAll: true,
      selectedIds: [],
      deselectedIds: ['note-2'],
      totalCount: 2,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expectSelectionSummary('Selected: 0 of 2')
  })

  it('loads another page on a near-bottom scroll and uses the next cursor', async () => {
    mockGetNotes
      .mockResolvedValueOnce({ notes: [notes[0]], totalCount: 2, hasMore: true, nextCursor: 7 })
      .mockResolvedValueOnce({ notes: [notes[1]], totalCount: 2, hasMore: false })
    renderDialog()
    await screen.findByText('Shopping list')

    const indicator = screen.getByText('Scroll down to load more')
    const scrollContainer = indicator.closest('[class*="overflow-y-auto"]')
    expect(scrollContainer).toBeTruthy()
    Object.defineProperties(scrollContainer, {
      scrollTop: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 250 },
    })
    fireEvent.scroll(scrollContainer!)

    await waitFor(() => expect(mockGetNotes).toHaveBeenCalledWith('user-1', { page: 7, pageSize: 50 }))
    expect(await screen.findByText('Travel plans')).toBeTruthy()
  })

  it('shows the empty state for a missing user and does not export without a selection', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const onExport = jest.fn()
    renderDialog({ onExport })

    expect(await screen.findByText('You do not have any notes to export yet')).toBeTruthy()
    expect(mockGetNotes).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Select all' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Export' }) as HTMLButtonElement).disabled).toBe(true)
    expect(onExport).not.toHaveBeenCalled()
  })

  it('keeps the empty state after a notes service error and allows closing', async () => {
    const onOpenChange = jest.fn()
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetNotes.mockRejectedValueOnce(new Error('notes unavailable'))
    renderDialog({ onOpenChange })

    expect(await screen.findByText('You do not have any notes to export yet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(consoleError).toHaveBeenCalledWith('Failed to load notes for export:', expect.any(Error))
    consoleError.mockRestore()
  })
})
