import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NoteView } from '@ui/web/components/features/notes/NoteView'
import { toast } from 'sonner'
import { copyNotePayloadToClipboard } from '@ui/web/lib/noteClipboard'

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

jest.mock('@/components/InteractiveTag', () => ({
  __esModule: true,
  default: ({ tag }: { tag: string }) => <span>{tag}</span>,
}))

jest.mock('@/components/HorizontalTagScroll', () => ({
  HorizontalTagScroll: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/features/notes/MoreActionsMenu', () => ({
  MoreActionsMenu: () => <div data-testid="more-actions-menu" />,
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('@ui/web/lib/noteClipboard', () => ({
  copyNotePayloadToClipboard: jest.fn().mockResolvedValue(undefined),
}))

const mockCopy = copyNotePayloadToClipboard as jest.MockedFunction<typeof copyNotePayloadToClipboard>

type NoteViewTestOverrides = Partial<{
  description: string
  content: string
  initialScrollTop: number
  created_at: string
  updated_at: string
  onViewSessionChange: (view: { scrollTop?: number }) => void
}>

function renderNoteView(overrides: NoteViewTestOverrides = {}) {
  return render(
    <NoteView
      note={{
        id: 'note-1',
        title: 'Test note',
        description: overrides.description ?? '<p>Copied body</p>',
        content: overrides.content ?? '<p>Copied body</p>',
        tags: ['tag-a'],
        created_at: overrides.created_at ?? '2025-01-01T10:00:00.000Z',
        updated_at: overrides.updated_at ?? '2025-01-01T10:00:00.000Z',
      } as never}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      onTagClick={jest.fn()}
      onRemoveTag={jest.fn()}
      initialScrollTop={overrides.initialScrollTop}
      onViewSessionChange={overrides.onViewSessionChange}
    />,
  )
}

describe('NoteView copy action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCopy.mockResolvedValue(undefined)
  })

  it('names undescribed images for reading without changing the copied note', async () => {
    const body = '<p>Photos<img src="https://example.com/first.png"><img src="https://example.com/decorative.png" alt=""><img src="https://example.com/second.png" alt="A sunny garden"></p>'
    const { container } = renderNoteView({ description: body })
    const images = container.querySelectorAll('img')

    expect(images[0].getAttribute('alt')).toBe('Image without description')
    expect(images[1].getAttribute('alt')).toBe('')
    expect(images[2].getAttribute('alt')).toBe('A sunny garden')

    fireEvent.click(screen.getByLabelText('Copy note'))
    await waitFor(() => expect(mockCopy).toHaveBeenCalled())
    const copiedHtml = mockCopy.mock.calls[0][0].html
    expect(copiedHtml).not.toContain('Image without description')
    expect(copiedHtml).toContain('alt="A sunny garden"')
    expect(copiedHtml).toContain('alt=""')
  })

  it('copies the note body with the self-copy marker and clean plain text', async () => {
    renderNoteView()

    fireEvent.click(screen.getByLabelText('Copy note'))

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('data-everfreenote-copy'),
          text: 'Copied body',
        }),
      )
    })
    expect(mockCopy.mock.calls[0][0].html).toContain('<p>Copied body</p>')
  })

  it('shows the on-button confirmation after a successful copy', async () => {
    renderNoteView()

    fireEvent.click(screen.getByLabelText('Copy note'))

    expect(await screen.findByText('Copied')).toBeTruthy()
  })

  it('disables the copy button for an empty note body', () => {
    renderNoteView({ description: '<p></p>', content: '' })

    expect((screen.getByLabelText('Copy note') as HTMLButtonElement).disabled).toBe(true)
  })

  it('surfaces an error toast when the clipboard write fails', async () => {
    mockCopy.mockRejectedValue(new Error('blocked'))
    renderNoteView()

    fireEvent.click(screen.getByLabelText('Copy note'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to copy note')
    })
  })

  it('restores the saved scroll position and reports later scrolling after the debounce delay', () => {
    jest.useFakeTimers()
    try {
      const onViewSessionChange = jest.fn()
      const { container } = renderNoteView({ initialScrollTop: 48, onViewSessionChange })
      const content = container.querySelector('.overflow-y-auto') as HTMLDivElement

      // Restore before the next frame, so a quick pane switch cannot capture
      // the reader's initial zero.
      expect(content.scrollTop).toBe(48)

      fireEvent.scroll(content, { target: { scrollTop: 60 } })
      fireEvent.scroll(content, { target: { scrollTop: 93 } })
      // Scroll updates are debounced: nothing is reported per event.
      expect(onViewSessionChange).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(250)
      })
      expect(onViewSessionChange).toHaveBeenCalledTimes(1)
      expect(onViewSessionChange).toHaveBeenCalledWith({ scrollTop: 93 })
    } finally {
      jest.useRealTimers()
    }
  })

  it('flushes the latest scroll position when the reading view unmounts', () => {
    jest.useFakeTimers()
    try {
      const onViewSessionChange = jest.fn()
      const { container, unmount } = renderNoteView({ onViewSessionChange })
      const content = container.querySelector('.overflow-y-auto') as HTMLDivElement

      fireEvent.scroll(content, { target: { scrollTop: 77 } })
      unmount()

      expect(onViewSessionChange).toHaveBeenCalledWith({ scrollTop: 77 })
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('NoteView dates', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2025-01-01T12:00:00.000Z') })
  })
  afterEach(() => { jest.useRealTimers() })

  it('keeps the compact edit date beneath the title and reveals both exact timestamps on demand', () => {
    const { container } = renderNoteView({ created_at: '2024-12-20T09:30:00.000Z' })
    const title = screen.getByRole('heading', { name: 'Test note' })
    const details = screen.getByRole('button', { name: 'Note details' })
    expect(details.textContent).toContain('Edited 2 hours ago')
    expect(title.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(details.compareDocumentPosition(screen.getByText('tag-a')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Note details' })).toBeNull()
    expect(container.textContent).not.toContain('Created:')
    expect(container.textContent).not.toContain('Updated:')

    fireEvent.click(details)
    const dialog = screen.getByRole('dialog', { name: 'Note details' })
    expect(dialog.textContent).toContain('Created')
    expect(dialog.textContent).toContain('Last edited')
    expect(Array.from(dialog.querySelectorAll('time'), time => time.dateTime)).toEqual([
      '2024-12-20T09:30:00.000Z', '2025-01-01T10:00:00.000Z',
    ])
    expect(dialog.textContent).toContain('Your local time')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    act(() => { jest.runOnlyPendingTimers() })
    expect(screen.queryByRole('dialog', { name: 'Note details' })).toBeNull()
  })

  it('refreshes the relative edit date while the note stays open', () => {
    renderNoteView({ updated_at: '2025-01-01T11:59:30.000Z' })
    expect(screen.getByRole('button', { name: 'Note details' }).textContent).toContain('Edited just now')
    act(() => { jest.advanceTimersByTime(60_000) })
    expect(screen.getByRole('button', { name: 'Note details' }).textContent).toContain('Edited 1 minute ago')
  })

  it('keeps reading available when imported timestamps are invalid', () => {
    renderNoteView({ created_at: 'invalid', updated_at: 'invalid' })
    expect(screen.getByText('Copied body')).toBeTruthy()
    const details = screen.getByRole('button', { name: 'Note details' })
    expect(details.textContent).toContain('Date unavailable')
    fireEvent.click(details)
    expect(screen.getAllByText('Unavailable')).toHaveLength(2)
  })
})
