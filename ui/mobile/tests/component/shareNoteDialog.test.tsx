import React from 'react'
import { Modal, Share } from 'react-native'
import { fireEvent, render, screen, waitFor } from '../testUtils'

import { ShareNoteDialog } from '@ui/mobile/components/ShareNoteDialog'

const mockGetPublicWebOrigin = jest.fn(() => 'http://localhost:3000')

jest.mock('@ui/mobile/adapters', () => ({
  getPublicWebOrigin: () => mockGetPublicWebOrigin(),
}))

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      muted: '#f3f4f6',
      mutedForeground: '#666666',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      destructive: '#dc2626',
    },
  }),
}))

const shareLink = {
  id: 'share-1',
  note_id: 'note-1',
  user_id: 'user-1',
  token: 'abc123',
  permission: 'view',
  is_active: true,
  created_at: '2026-04-28T10:00:00.000Z',
  updated_at: '2026-04-28T10:00:00.000Z',
}

function createSupabaseMock(results = [shareLink]) {
  const existingMaybeSingle = jest
    .fn()
    .mockImplementation(() => Promise.resolve({ data: results.shift() ?? null, error: null }))
  const eqIsActive = jest.fn().mockReturnValue({ maybeSingle: existingMaybeSingle })
  const eqPermission = jest.fn().mockReturnValue({ eq: eqIsActive })
  const eqUserId = jest.fn().mockReturnValue({ eq: eqPermission })
  const eqNoteId = jest.fn().mockReturnValue({ eq: eqUserId })
  const select = jest.fn().mockReturnValue({ eq: eqNoteId })

  return {
    from: jest.fn().mockReturnValue({ select }),
    chain: { eqNoteId, eqUserId, existingMaybeSingle },
  }
}

let mockSupabase = createSupabaseMock()
let mockUser: { id: string } | null = { id: 'user-1' }

jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: mockSupabase,
    user: mockUser,
  }),
}))

describe('ShareNoteDialog', () => {
  beforeEach(() => {
    mockSupabase = createSupabaseMock()
    mockUser = { id: 'user-1' }
    mockGetPublicWebOrigin.mockReturnValue('http://localhost:3000')
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
  })

  it('renders "Share note" modal title when visible is true', async () => {
    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)
    expect(screen.getByText('Share note')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })
  })

  it('generates a public link when opened and displays it in link input', async () => {
    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    expect(screen.getByText('Anyone with the link can view')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })

    expect(mockSupabase.chain.eqNoteId).toHaveBeenCalledWith('note_id', 'note-1')
    expect(mockSupabase.chain.eqUserId).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('invokes native Share.share when "Share link" button is pressed', async () => {
    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Share link'))

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        title: 'Shared note',
        message: 'http://localhost:3000/share/?token=abc123',
        url: 'http://localhost:3000/share/?token=abc123',
      })
      expect(screen.getByLabelText('Link shared')).toBeTruthy()
    })
  })

  it('shows an auth error when no user is available', async () => {
    mockUser = null

    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Sign in again to create a share link.')).toBeTruthy()
    })
  })

  it('shows a config error when no public web origin can be resolved', async () => {
    mockGetPublicWebOrigin.mockReturnValue('')

    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText('Public web origin is not configured for this mobile build.')
      ).toBeTruthy()
    })
  })

  it('handles native share cancellation', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction })

    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Share link'))

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled()
    })

    expect(screen.getByLabelText('Share link')).toBeTruthy()
    expect(screen.queryByLabelText('Link shared')).toBeNull()
  })

  it('handles native share errors gracefully', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Sharing unavailable'))

    render(<ShareNoteDialog noteId="note-1" visible onClose={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })

    fireEvent.press(screen.getByLabelText('Share link'))

    await waitFor(() => {
      expect(
        screen.getByText('Could not open sharing. Select the link and copy it manually.')
      ).toBeTruthy()
    })
  })

  it('handles close action when not loading', async () => {
    const handleClose = jest.fn()
    render(<ShareNoteDialog noteId="note-1" visible onClose={handleClose} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/share/?token=abc123')).toBeTruthy()
    })

    const modal = screen.UNSAFE_getByType(Modal)
    fireEvent(modal, 'requestClose')

    expect(handleClose).toHaveBeenCalled()
  })
})
