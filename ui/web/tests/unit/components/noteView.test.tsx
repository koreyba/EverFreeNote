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
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@ui/web/lib/noteClipboard', () => ({
  copyNotePayloadToClipboard: jest.fn().mockResolvedValue(undefined),
}))

describe('NoteView copy action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('copies the note body from reading mode', async () => {
    render(
      <NoteView
        note={{
          id: 'note-1',
          title: 'Test note',
          description: '<p>Copied body</p>',
          content: '<p>Copied body</p>',
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

    fireEvent.click(screen.getByLabelText('Copy note'))

    await waitFor(() => {
      expect(copyNotePayloadToClipboard).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('<p>Copied body</p>'),
        text: 'Copied body',
      }))
    })
    expect(toast.success).toHaveBeenCalledWith('Note copied')
  })
})
