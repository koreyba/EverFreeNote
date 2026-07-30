import React from 'react'
import { Modal } from 'react-native'
import { fireEvent, render, screen, waitFor, act } from '../testUtils'
import { NoteIndexMenu } from '@ui/mobile/components/NoteIndexMenu'

const mockUseRagStatus = jest.fn()
const mockGetWordPressStatus = jest.fn()
const mockInvoke = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      mutedForeground: '#666666',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      secondary: '#f7f7f7',
      secondaryForeground: '#222222',
      destructive: '#dc2626',
      destructiveForeground: '#ffffff',
      accent: '#f2f2f2',
      selectionBackground: '#f2fff2',
      selectionBorder: '#00aa00',
      selectionForeground: '#006600',
    },
  }),
}))

jest.mock('@ui/mobile/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: { functions: { invoke: mockInvoke } },
    user: { id: 'test-user-id' },
  }),
}))

jest.mock('@ui/mobile/hooks/useRagStatus', () => ({
  useRagStatus: (...args: unknown[]) => mockUseRagStatus(...args),
}))

jest.mock('@core/services/wordpressSettings', () => ({
  WordPressSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockGetWordPressStatus,
  })),
}))

function setRagStatus(overrides: Partial<{
  chunkCount: number
  indexedAt: string | null
  isLoading: boolean
}> = {}) {
  mockUseRagStatus.mockReturnValue({
    chunkCount: 0,
    indexedAt: null,
    isLoading: false,
    refresh: jest.fn(),
    ...overrides,
  })
}

function renderMenu(overrides: Partial<React.ComponentProps<typeof NoteIndexMenu>> = {}) {
  return render(
    <NoteIndexMenu
      noteId="note-1"
      visible
      onClose={jest.fn()}
      {...overrides}
    />,
  )
}

describe('NoteIndexMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setRagStatus()
    mockGetWordPressStatus.mockImplementation(() => new Promise(() => undefined))
    mockInvoke.mockResolvedValue({ data: { outcome: 'indexed', chunkCount: 2 }, error: null })
  })

  it('reflects visibility and closes from the modal request or Cancel action', async () => {
    const onClose = jest.fn()
    const onExportToWordPress = jest.fn()
    const view = renderMenu({ onClose, onExportToWordPress, visible: false })
    const modal = view.UNSAFE_getAllByType(Modal)[0]

    expect(modal.props.visible).toBe(false)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    view.rerender(
      <NoteIndexMenu
        noteId="note-1"
        visible
        onClose={onClose}
        onExportToWordPress={onExportToWordPress}
      />,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(view.UNSAFE_getAllByType(Modal)[0].props.visible).toBe(true)

    fireEvent(view.UNSAFE_getAllByType(Modal)[0], 'requestClose')
    fireEvent.press(screen.getByLabelText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows share and configured WordPress actions and closes before invoking callbacks', async () => {
    const onClose = jest.fn()
    const onShareNote = jest.fn()
    const onExportToWordPress = jest.fn()
    mockGetWordPressStatus.mockResolvedValue({
      configured: true,
      integration: { siteUrl: 'https://example.com', wpUsername: 'editor', enabled: true, hasPassword: true },
    })

    renderMenu({ onClose, onShareNote, onExportToWordPress })

    expect(screen.getByLabelText('Share note')).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Export to WordPress')).toBeTruthy())

    fireEvent.press(screen.getByLabelText('Share note'))
    fireEvent.press(screen.getByLabelText('Export to WordPress'))

    expect(onClose).toHaveBeenCalledTimes(2)
    expect(onShareNote).toHaveBeenCalledTimes(1)
    expect(onExportToWordPress).toHaveBeenCalledTimes(1)
  })

  it('renders indexed status, supports re-index, and confirms removal from the index', async () => {
    setRagStatus({ chunkCount: 3, indexedAt: '2026-07-30T10:00:00.000Z' })
    renderMenu()

    expect(screen.getByText('Re-index note')).toBeTruthy()
    expect(screen.getByText(/3 chunks/)).toBeTruthy()
    expect(screen.getByLabelText('Re-index note').props.accessibilityState.disabled).toBe(false)
    expect(screen.getByLabelText('Remove from index').props.accessibilityState.disabled).toBe(false)

    fireEvent.press(screen.getByLabelText('Re-index note'))
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('rag-index', {
      body: { noteId: 'note-1', action: 'reindex', debugChunks: true },
    }))
    mockInvoke.mockClear()

    fireEvent.press(screen.getByLabelText('Remove from index'))
    expect(screen.getByText('Remove from AI index?')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Cancel delete'))
    expect(screen.queryByText('Remove from AI index?')).toBeNull()

    fireEvent.press(screen.getByLabelText('Remove from index'))
    fireEvent.press(screen.getByLabelText('Confirm remove from index'))

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('rag-index', {
      body: { noteId: 'note-1', action: 'delete' },
    }))
  })

  it('exposes loading and not-indexed accessibility states', () => {
    setRagStatus({ isLoading: true })
    renderMenu()

    expect(screen.getByLabelText('Index note').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByLabelText('Remove from index').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByLabelText('Cancel').props.accessibilityState.disabled).toBe(false)
    expect(screen.getByText('Note options')).toBeTruthy()
  })

  it('keeps the menu disabled while indexing is in progress', async () => {
    let resolveInvoke: ((value: { data: unknown; error: null }) => void) | undefined
    mockInvoke.mockImplementation(() => new Promise((resolve) => {
      resolveInvoke = resolve
    }))
    const onClose = jest.fn()
    renderMenu({ onClose })

    fireEvent.press(screen.getByLabelText('Index note'))

    await waitFor(() => {
      expect(screen.getByLabelText('Index note').props.accessibilityState.disabled).toBe(true)
      expect(screen.getByLabelText('Remove from index').props.accessibilityState.disabled).toBe(true)
      expect(screen.getByLabelText('Cancel').props.accessibilityState.disabled).toBe(true)
    })
    fireEvent.press(screen.getByLabelText('Cancel'))
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      resolveInvoke?.({ data: { outcome: 'indexed', chunkCount: 2 }, error: null })
    })
  })
})
