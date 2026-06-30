/**
 * Screen tests for the note Copy button (mobile).
 * Covers: native clipboard write (HTML + plain fallback), empty-body disable,
 * and error feedback — the historically fragile mobile copy path.
 */
import type { ReactNode } from 'react'
import {
  createQueryWrapper,
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '../testUtils'
import type { QueryClient } from '@tanstack/react-query'

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'test-note-id' }),
  usePathname: () => '/note/[id]',
  Stack: {
    Screen: ({ children, options }: { children: ReactNode; options?: { headerRight?: () => ReactNode } }) => {
      const { View } = require('react-native')
      return (
        <View>
          {options?.headerRight && <View testID="header-right">{options.headerRight()}</View>}
          {children}
        </View>
      )
    },
  },
}))

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({ client: {}, user: { id: 'test-user-id' } })),
  useTheme: () => ({
    colors: {
      background: '#fff', foreground: '#111', card: '#fff', border: '#e0e0e0', accent: '#f2f2f2',
      primary: '#00aa00', secondary: '#f7f7f7', mutedForeground: '#666', secondaryForeground: '#222',
      destructive: '#f00', destructiveForeground: '#fff',
    },
  }),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    hasPendingWrites: jest.fn().mockResolvedValue(false),
  },
}))
jest.mock('@core/services/notes')
jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: { isOnline: jest.fn().mockReturnValue(true) },
}))
jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: { getManager: jest.fn().mockReturnValue({ enqueue: jest.fn().mockResolvedValue(undefined) }) },
}))

// expo-clipboard + Toast under test
const mockSetStringAsync = jest.fn()
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
  StringFormat: { HTML: 'html', PLAIN_TEXT: 'plainText' },
}))
const mockToastShow = jest.fn()
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: (...a: unknown[]) => mockToastShow(...a) } }))

// EditorWebView mock exposes getCopyPayload (configurable per test)
let mockCopyPayload: { html: string; text: string } | null = { html: '<div>rich</div>', text: 'rich' }
jest.mock('@ui/mobile/components/EditorWebView', () => {
  const React = require('react')
  const { View } = require('react-native')
  return React.forwardRef((_props: unknown, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      runCommand: jest.fn(),
      setContent: jest.fn(),
      scrollToChunk: jest.fn(),
      getContent: jest.fn().mockResolvedValue(''),
      getCopyPayload: jest.fn().mockImplementation(() => Promise.resolve(mockCopyPayload)),
    }))
    return <View testID="editor-webview" />
  })
})

jest.mock('@ui/mobile/components/EditorToolbar', () => ({ EditorToolbar: () => null, TOOLBAR_CONTENT_HEIGHT: 0 }))
jest.mock('@ui/mobile/components/ThemeToggle', () => ({ ThemeToggle: () => null }))
jest.mock('@ui/mobile/components/tags/TagInput', () => ({ TagInput: () => null }))
jest.mock('@ui/mobile/components/NoteBodyPreview', () => ({ NoteBodyPreview: () => null }))
jest.mock('@ui/mobile/components/NoteIndexMenu', () => ({ NoteIndexMenu: () => null }))
jest.mock('@ui/mobile/components/ShareNoteDialog', () => ({ ShareNoteDialog: () => null }))
jest.mock('@ui/mobile/components/WordPressPublishDialog', () => ({ WordPressPublishDialog: () => null }))

import NoteEditorScreen from '@ui/mobile/app/note/[id]'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>

function mockNote(description: string) {
  return {
    id: 'test-note-id', title: 'Test Note', description, tags: ['tag1'],
    created_at: '2025-01-01T10:00:00.000Z', updated_at: '2025-01-01T10:00:00.000Z', user_id: 'test-user-id',
  }
}

function primeNote(description: string) {
  ;(mockNoteService.prototype as typeof mockNoteService.prototype & { getNoteStatus: jest.Mock }).getNoteStatus =
    jest.fn().mockResolvedValue({ status: 'found', note: mockNote(description) })
  mockNoteService.prototype.getNote = jest.fn().mockResolvedValue(mockNote(description))
  mockNoteService.prototype.updateNote = jest.fn().mockResolvedValue(mockNote(description))
}

describe('NoteEditorScreen - Copy button', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    jest.clearAllMocks()
    mockCopyPayload = { html: '<div>rich</div>', text: 'rich' }
    mockSetStringAsync.mockResolvedValue(true)
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
    primeNote('<p>Test content</p>')
  })

  afterEach(() => queryClient.clear())

  it('renders the copy button enabled for a non-empty note', async () => {
    render(<NoteEditorScreen />, { wrapper })
    const button = await screen.findByLabelText('Copy note')
    expect(button.props.accessibilityState?.disabled).toBeFalsy()
  })

  it('writes HTML to the native clipboard with the HTML input format', async () => {
    render(<NoteEditorScreen />, { wrapper })
    const button = await screen.findByLabelText('Copy note')
    fireEvent.press(button)

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenCalledWith('<div>rich</div>', { inputFormat: 'html' })
    })
    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('falls back to plain text when the HTML clipboard write is rejected', async () => {
    mockSetStringAsync
      .mockRejectedValueOnce(new Error('html unsupported'))
      .mockResolvedValueOnce(true)

    render(<NoteEditorScreen />, { wrapper })
    const button = await screen.findByLabelText('Copy note')
    fireEvent.press(button)

    await waitFor(() => {
      expect(mockSetStringAsync).toHaveBeenNthCalledWith(2, 'rich')
    })
    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('shows an error toast when no payload is returned', async () => {
    mockCopyPayload = null
    render(<NoteEditorScreen />, { wrapper })
    const button = await screen.findByLabelText('Copy note')
    fireEvent.press(button)

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))
    })
    expect(mockSetStringAsync).not.toHaveBeenCalled()
  })

  it('disables the copy button for an empty note body', async () => {
    primeNote('<p></p>')
    render(<NoteEditorScreen />, { wrapper })
    const button = await screen.findByLabelText('Copy note')
    await waitFor(() => {
      expect(button.props.accessibilityState?.disabled).toBe(true)
    })
  })
})
