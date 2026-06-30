import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function renderNoteView(overrides: Partial<{ description: string; content: string }> = {}) {
  return render(
    <NoteView
      note={{
        id: 'note-1',
        title: 'Test note',
        description: overrides.description ?? '<p>Copied body</p>',
        content: overrides.content ?? '<p>Copied body</p>',
        tags: ['tag-a'],
        created_at: '2025-01-01T10:00:00.000Z',
        updated_at: '2025-01-01T10:00:00.000Z',
      } as never}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      onTagClick={jest.fn()}
      onRemoveTag={jest.fn()}
    />,
  )
}

describe('NoteView copy action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCopy.mockResolvedValue(undefined)
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
})
