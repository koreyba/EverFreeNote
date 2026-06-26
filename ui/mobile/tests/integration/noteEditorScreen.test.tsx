/**
 * Screen tests for NoteEditorScreen
 * Tests delete button functionality, navigation after deletion, loading states
 */
import type { ReactNode } from 'react'
import { Alert } from 'react-native'
import type { QueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import {
  act,
  createQueryWrapper,
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '../testUtils'

// Mock expo-router
const mockPush = jest.fn()
const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockSetParams = jest.fn()
const mockPathname = '/note/[id]'
let mockLocalSearchParams: { id: string; focusOffset?: string; focusLength?: string; focusRequestId?: string } = {
  id: 'test-note-id',
}

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockLocalSearchParams,
  usePathname: () => mockPathname,
  Stack: {
    Screen: ({ children, options }: { children: ReactNode; options?: { headerRight?: () => ReactNode; headerLeft?: () => ReactNode; headerTitle?: () => ReactNode } }) => {
      const { View } = require('react-native')
      return (
        <View>
          {/* Render header options if provided */}
          {options?.headerTitle && (
            <View testID="header-title">
              {typeof options.headerTitle === 'function' ? options.headerTitle() : options.headerTitle}
            </View>
          )}
          {options?.headerRight && (
            <View testID="header-right">
              {typeof options.headerRight === 'function' ? options.headerRight() : options.headerRight}
            </View>
          )}
          {options?.headerLeft && (
            <View testID="header-left">
              {typeof options.headerLeft === 'function' ? options.headerLeft() : options.headerLeft}
            </View>
          )}
          {children}
        </View>
      )
    },
  },
}))

// Mock providers
const mockInvoke = jest.fn().mockImplementation((name: string) => {
  if (name === 'wordpress-settings-status') {
    return Promise.resolve({
      data: {
        configured: true,
        integration: {
          siteUrl: 'https://stage.example.com',
          wpUsername: 'editor',
          enabled: true,
          hasPassword: true,
        },
      },
      error: null,
    })
  }

  return Promise.resolve({ data: null, error: null })
})
const mockSupabaseContext = {
  client: {
    functions: {
      invoke: mockInvoke,
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-note-id',
          title: 'Test Note',
          description: '<p>Test content</p>',
          tags: ['tag1'],
          created_at: '2025-01-01T10:00:00.000Z',
          updated_at: '2025-01-01T10:00:00.000Z',
          user_id: 'test-user-id',
        },
        error: null,
      }),
    })),
  },
  user: { id: 'test-user-id' },
}

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => mockSupabaseContext),
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      accent: '#f2f2f2',
      primary: '#00aa00',
      secondary: '#f7f7f7',
      mutedForeground: '#666666',
      secondaryForeground: '#222222',
      destructive: '#ff0000',
      destructiveForeground: '#ffffff',
    },
  }),
}))

// Mock services
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
  mobileNetworkStatusProvider: {
    isOnline: jest.fn().mockReturnValue(true),
  },
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

// Mock components
const mockEditorCallbacks: {
  onContentChange?: (html: string) => void
  onBlur?: () => void
  onFocus?: () => void
  onReady?: () => void
} = {}

const mockToolbarCallbacks: {
  onMenuVisibilityChange?: (visible: boolean) => void
} = {}
const mockScrollToChunk = jest.fn()
const mockSetEditorContent = jest.fn()
const mockGetEditorContent = jest.fn().mockResolvedValue('<p>Test content</p>')
const defaultNote = {
  id: 'test-note-id',
  title: 'Test Note',
  description: '<p>Test content</p>',
  tags: ['tag1'],
  created_at: '2025-01-01T10:00:00.000Z',
  updated_at: '2025-01-01T10:00:00.000Z',
  user_id: 'test-user-id',
}

jest.mock('@ui/mobile/components/EditorWebView', () => {
  const React = require('react')
  const { View, Text } = require('react-native')

  return React.forwardRef((props: { onContentChange?: (html: string) => void; onBlur?: () => void; onFocus?: () => void; onReady?: () => void }, ref: unknown) => {
    // Store callbacks for test access
    mockEditorCallbacks.onContentChange = props.onContentChange
    mockEditorCallbacks.onBlur = props.onBlur
    mockEditorCallbacks.onFocus = props.onFocus
    mockEditorCallbacks.onReady = props.onReady

    React.useImperativeHandle(ref, () => ({
      runCommand: jest.fn(),
      setContent: mockSetEditorContent,
      scrollToChunk: mockScrollToChunk,
      getContent: mockGetEditorContent,
    }))

    return (
      <View testID="editor-webview">
        <Text>Editor Content</Text>
      </View>
    )
  })
})

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  StringFormat: {
    HTML: 'html',
    PLAIN_TEXT: 'plainText',
  },
}))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
  },
}))

jest.mock('@ui/mobile/components/EditorToolbar', () => ({
  EditorToolbar: ({ onMenuVisibilityChange }: { onMenuVisibilityChange?: (visible: boolean) => void }) => {
    const { View, Text } = require('react-native')
    mockToolbarCallbacks.onMenuVisibilityChange = onMenuVisibilityChange
    return (
      <View testID="editor-toolbar">
        <Text>Toolbar</Text>
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/ThemeToggle', () => ({
  ThemeToggle: () => {
    const { View, Text } = require('react-native')
    return (
      <View testID="theme-toggle">
        <Text>Theme Toggle</Text>
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/tags/TagInput', () => ({
  TagInput: ({ tags }: { tags: string[] }) => {
    const { View, Text } = require('react-native')
    return (
      <View testID="tag-input">
        {tags.map((tag: string) => (
          <Text key={tag}>{tag}</Text>
        ))}
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/NoteIndexMenu', () => ({
  NoteIndexMenu: ({
    visible,
    noteId,
    onClose,
    onShareNote,
    onExportToWordPress,
  }: {
    visible: boolean
    noteId: string
    onClose: () => void
    onShareNote: () => void
    onExportToWordPress?: () => void
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID="note-index-menu">
        <Text testID="note-index-menu-visibility">{visible ? 'visible' : 'hidden'}</Text>
        <Text testID="note-index-menu-note-id">{noteId}</Text>
        {visible ? (
          <>
            <Pressable accessibilityLabel="Share note" onPress={onShareNote}>
              <Text>Share note</Text>
            </Pressable>
            {onExportToWordPress ? (
              <Pressable accessibilityLabel="Export to WordPress" onPress={onExportToWordPress}>
                <Text>Export to WordPress</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityLabel="Close note index menu" onPress={onClose} />
          </>
        ) : null}
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/ShareNoteDialog', () => ({
  ShareNoteDialog: ({ visible, noteId, onClose }: { visible: boolean; noteId: string; onClose: () => void }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID="share-note-dialog">
        <Text testID="share-note-dialog-visibility">{visible ? 'visible' : 'hidden'}</Text>
        <Text testID="share-note-dialog-note-id">{noteId}</Text>
        {visible ? <Pressable accessibilityLabel="Close share note" onPress={onClose} /> : null}
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/WordPressPublishDialog', () => ({
  WordPressPublishDialog: ({
    visible,
    note,
    onClose,
  }: {
    visible: boolean
    note: { id: string; title: string; tags: string[] }
    onClose: () => void
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID="wordpress-publish-dialog">
        <Text testID="wordpress-publish-dialog-visibility">{visible ? 'visible' : 'hidden'}</Text>
        <Text testID="wordpress-publish-dialog-note-id">{note.id}</Text>
        <Text testID="wordpress-publish-dialog-title">{`wp-title:${note.title}`}</Text>
        <Text testID="wordpress-publish-dialog-tags">{`wp-tags:${note.tags.join(',')}`}</Text>
        {visible ? <Pressable accessibilityLabel="Close WordPress publish" onPress={onClose} /> : null}
      </View>
    )
  },
}))

import NoteEditorScreen from '@ui/mobile/app/note/[id]'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

async function renderNoteEditorScreen(
  wrapper: ReturnType<typeof createQueryWrapper>,
  draftHtml?: string,
) {
  render(<NoteEditorScreen />, { wrapper })

  await waitFor(() => {
    expect(screen.queryByTestId('editor-webview')).toBeTruthy()
  })

  if (draftHtml) {
    act(() => {
      mockEditorCallbacks.onContentChange?.(draftHtml)
    })
  }
}

async function expectCopyNoteUsesHtml(expectedHtml: string) {
  fireEvent.press(screen.getByLabelText('Copy note'))

  await waitFor(() => {
    expect(mockGetEditorContent).toHaveBeenCalled()
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      expect.stringContaining(expectedHtml),
      { inputFormat: 'html' },
    )
    expect(Toast.show).toHaveBeenCalledWith({ type: 'success', text1: 'Note copied' })
  })
}

async function renderAndCopyNote(wrapper: ReturnType<typeof createQueryWrapper>) {
  await renderNoteEditorScreen(wrapper)

  fireEvent.press(screen.getByLabelText('Copy note'))
}

function expectClipboardWrite(
  callNumber: number,
  text: string | ReturnType<typeof expect.stringContaining>,
  inputFormat?: 'html' | 'plainText',
) {
  if (inputFormat) {
    expect(Clipboard.setStringAsync).toHaveBeenNthCalledWith(callNumber, text, { inputFormat })
  } else {
    expect(Clipboard.setStringAsync).toHaveBeenNthCalledWith(callNumber, text)
  }
}

function expectCopyFailureLog(stage: string, message: string) {
  expect(consoleErrorSpy).toHaveBeenCalledWith(`[NoteCopy] ${stage} copy failed`, {
    name: 'Error',
    message,
  })
}

describe('NoteEditorScreen - Delete Functionality', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalSearchParams = { id: 'test-note-id' }
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
    mockEditorCallbacks.onContentChange = undefined
    mockEditorCallbacks.onBlur = undefined
    mockEditorCallbacks.onFocus = undefined
    mockEditorCallbacks.onReady = undefined
    mockToolbarCallbacks.onMenuVisibilityChange = undefined
    mockScrollToChunk.mockReset()
    mockSetEditorContent.mockReset()
    mockGetEditorContent.mockReset()
    mockGetEditorContent.mockResolvedValue('<p>Test content</p>')
    mockSetParams.mockReset()
    mockReplace.mockReset()
    mockInvoke.mockClear()
    alertSpy.mockClear()
    consoleErrorSpy.mockClear()
    ;(Clipboard.setStringAsync as jest.Mock).mockClear()
    ;(Toast.show as jest.Mock).mockClear()
    ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
      getNoteStatus: jest.Mock
    }).getNoteStatus = jest.fn().mockResolvedValue({
      status: 'found',
      note: defaultNote,
    })
    mockNoteService.prototype.getNote = jest.fn().mockResolvedValue(defaultNote)

    mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('test-note-id')
    mockNoteService.prototype.updateNote = jest.fn().mockResolvedValue({
      id: 'test-note-id',
      title: 'Updated Note',
      description: '<p>Updated content</p>',
      tags: ['tag1'],
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z',
      user_id: 'test-user-id',
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })


  describe('Delete button', () => {
    it('renders delete button in header', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Delete button should be accessible
      const deleteButton = screen.getByLabelText('Delete note')
      expect(deleteButton).toBeTruthy()
    })

    it('calls delete mutation when delete button is pressed', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('test-note-id')
      })
    })

    it('navigates back after successful deletion', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })

    it('disables delete button while deletion is in progress', async () => {
      let resolveDelete: ((value: string) => void) | undefined
      const deletePromise = new Promise<string>((resolve) => {
        resolveDelete = resolve
      })

      mockNoteService.prototype.deleteNote = jest.fn().mockReturnValue(deletePromise)

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      // Button should show loading indicator when deletion is in progress
      await waitFor(() => {
        expect(screen.queryByTestId('activity-indicator')).toBeTruthy()
      })

      // Resolve deletion
      if (resolveDelete) {
        resolveDelete('test-note-id')
      }

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })

    it('shows loading indicator while deleting', async () => {
      let resolveDelete: ((value: string) => void) | undefined
      const deletePromise = new Promise<string>((resolve) => {
        resolveDelete = resolve
      })

      mockNoteService.prototype.deleteNote = jest.fn().mockReturnValue(deletePromise)

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      // Activity indicator should be shown
      await waitFor(() => {
        expect(screen.queryByTestId('activity-indicator')).toBeTruthy()
      })

      // Resolve deletion
      if (resolveDelete) {
        resolveDelete('test-note-id')
      }

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })
  })

  describe('Delete error handling', () => {
    it('navigates back when API fails but fallback succeeds', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Should navigate back - fallback to queue succeeded
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })

    it('completes deletion via fallback when API fails', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Deletion should succeed via fallback - user navigates away
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })
  })

  describe('Loading states', () => {
    it('shows loading indicator when note is being fetched', () => {
      const notePromise = new Promise(() => {
        // Never resolves
      })

      ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
        getNoteStatus: jest.Mock
      }).getNoteStatus = jest.fn().mockReturnValue(notePromise)

      render(<NoteEditorScreen />, { wrapper })

      // Should show loading indicator
      expect(screen.getByTestId('activity-indicator')).toBeTruthy()
    })

    it('shows error message when note fails to load', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
        getNoteStatus: jest.Mock
      }).getNoteStatus = jest.fn().mockResolvedValue({
        status: 'transient_error',
        error: new Error('Failed to load'),
      })

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('Error loading note')).toBeTruthy()
      })

      warnSpy.mockRestore()
    })

    it('shows deleted-note message and navigates back when the remote note is missing', async () => {
      ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
        getNoteStatus?: jest.Mock
      }).getNoteStatus = jest.fn().mockResolvedValue({
        status: 'not_found',
      })

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByTestId('activity-indicator')).toBeTruthy()
      })

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Note deleted',
          'This note was deleted on another device.',
          expect.arrayContaining([
            expect.objectContaining({
              text: 'OK',
              onPress: expect.any(Function),
            }),
          ])
        )
      })

      const buttons = alertSpy.mock.calls[0]?.[2]
      const okButton = Array.isArray(buttons)
        ? buttons.find((button) => (button as { text?: string }).text === 'OK')
        : undefined

      act(() => {
        okButton?.onPress?.()
      })

      expect(mockBack).toHaveBeenCalled()
    })

    it('does not show delete button when note is loading', () => {
      const notePromise = new Promise(() => {
        // Never resolves
      })

      ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
        getNoteStatus: jest.Mock
      }).getNoteStatus = jest.fn().mockReturnValue(notePromise)

      render(<NoteEditorScreen />, { wrapper })

      expect(screen.queryByLabelText('Delete note')).toBeNull()
    })

    it('does not show delete button when note fails to load', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      ;(mockNoteService.prototype as typeof mockNoteService.prototype & {
        getNoteStatus: jest.Mock
      }).getNoteStatus = jest.fn().mockResolvedValue({
        status: 'transient_error',
        error: new Error('Failed to load'),
      })

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('Error loading note')).toBeTruthy()
      })

      expect(screen.queryByLabelText('Delete note')).toBeNull()

      warnSpy.mockRestore()
    })
  })

  describe('Integration with editor', () => {
    it('loads note data into editor', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Note')).toBeTruthy()
      })

      expect(screen.getByText('tag1')).toBeTruthy()
    })

    it('preserves unsaved changes when delete button is pressed', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Change title
      const titleInput = screen.getByDisplayValue('Test Note')
      fireEvent.changeText(titleInput, 'Modified Title')

      // Press delete - should delete original note, not wait for changes to save
      const deleteButton = screen.getByLabelText('Delete note')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('test-note-id')
      })
    })

    it('does not let a same-note refresh restore an older title over a newer draft', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const titleInput = screen.getByDisplayValue('Test Note')
      fireEvent.changeText(titleInput, 'First title')
      fireEvent.changeText(titleInput, 'Second title')

      await act(async () => {
        queryClient.setQueryData(['note', 'test-note-id'], {
          note: {
            ...defaultNote,
            title: 'First title',
          },
          status: 'found',
        })
      })

      expect(screen.getByDisplayValue('Second title')).toBeTruthy()

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      await waitFor(() => {
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith(
          'test-note-id',
          expect.objectContaining({ title: 'Second title' })
        )
      })
    })

    it('adopts clean remote updates without emitting a compensating save on blur', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      mockNoteService.prototype.updateNote.mockClear()

      await act(async () => {
        queryClient.setQueryData(['note', 'test-note-id'], {
          note: {
            ...defaultNote,
            title: 'Remote title',
            description: '<p>Remote body</p>',
            tags: ['remote-tag'],
          },
          status: 'found',
        })
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Remote title')).toBeTruthy()
      })
      await waitFor(() => {
        expect(screen.getByText('remote-tag')).toBeTruthy()
      })
      await waitFor(() => {
        expect(mockSetEditorContent).toHaveBeenCalledWith('<p>Remote body</p>')
      })

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(mockNoteService.prototype.updateNote).not.toHaveBeenCalled()
    })

    it('preserves dirty local fields, adopts clean remote fields, and saves only the remaining dirty patch', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const titleInput = screen.getByDisplayValue('Test Note')
      fireEvent.changeText(titleInput, 'Local title')

      await act(async () => {
        queryClient.setQueryData(['note', 'test-note-id'], {
          note: {
            ...defaultNote,
            title: 'Remote title',
            description: '<p>Remote body</p>',
            tags: ['remote-tag'],
          },
          status: 'found',
        })
      })

      expect(screen.getByDisplayValue('Local title')).toBeTruthy()
      await waitFor(() => {
        expect(screen.getByText('remote-tag')).toBeTruthy()
      })
      await waitFor(() => {
        expect(mockSetEditorContent).toHaveBeenCalledWith('<p>Remote body</p>')
      })

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      await waitFor(() => {
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith(
          'test-note-id',
          { title: 'Local title' }
        )
      })
    })

    it('treats a matching remote refresh as an acknowledgement and skips duplicate save on blur', async () => {
      jest.useFakeTimers()

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const titleInput = screen.getByDisplayValue('Test Note')
      fireEvent.changeText(titleInput, 'Local title')

      await act(async () => {
        queryClient.setQueryData(['note', 'test-note-id'], {
          note: {
            ...defaultNote,
            title: 'Local title',
          },
          status: 'found',
        })
      })

      act(() => {
        jest.advanceTimersByTime(1)
      })

      mockNoteService.prototype.updateNote.mockClear()

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(mockNoteService.prototype.updateNote).not.toHaveBeenCalled()

      jest.useRealTimers()
    })
  })

  describe('Accessibility', () => {
    it('has correct accessibility label on delete button', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      expect(deleteButton.props.accessibilityLabel).toBe('Delete note')
    })

    it('delete button is accessible via accessibility tools', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      const deleteButton = screen.getByLabelText('Delete note')
      expect(deleteButton.props.accessible).toBeTruthy()
    })
  })

  describe('Header configuration', () => {
    it('includes theme toggle in header', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByTestId('theme-toggle')).toBeTruthy()
      })
    })

    it('positions delete button and theme toggle in header actions', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(screen.getByLabelText('Delete note')).toBeTruthy()
      expect(screen.getByLabelText('Copy note')).toBeTruthy()
      expect(screen.getByTestId('theme-toggle')).toBeTruthy()
    })

    it('copies the live editor HTML from the header copy button', async () => {
      await renderNoteEditorScreen(wrapper)

      await expectCopyNoteUsesHtml('<p>Test content</p>')
    })

    it('falls back to the latest draft HTML when getContent returns only whitespace', async () => {
      mockGetEditorContent.mockResolvedValueOnce('   ')

      await renderNoteEditorScreen(wrapper, '<p>Draft fallback</p>')

      await expectCopyNoteUsesHtml('<p>Draft fallback</p>')
    })

    it('falls back to the latest draft HTML when getContent rejects', async () => {
      mockGetEditorContent.mockRejectedValueOnce(new Error('editor unavailable'))

      await renderNoteEditorScreen(wrapper, '<p>Rejected fallback</p>')

      await expectCopyNoteUsesHtml('<p>Rejected fallback</p>')
    })

    it('falls back to plain-text copy when HTML clipboard write fails', async () => {
      ;(Clipboard.setStringAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('html unsupported'))
        .mockResolvedValueOnce(true)

      await renderAndCopyNote(wrapper)

      await waitFor(() => {
        expectClipboardWrite(1, expect.stringContaining('<p>Test content</p>'), 'html')
        expectClipboardWrite(2, 'Test content', 'plainText')
        expectCopyFailureLog('html', 'html unsupported')
        expect(Toast.show).toHaveBeenCalledWith({ type: 'success', text1: 'Note copied' })
      })
    })

    it('falls back to legacy plain-text copy when formatted clipboard writes fail', async () => {
      ;(Clipboard.setStringAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('html unsupported'))
        .mockRejectedValueOnce(new Error('formatted plain unsupported'))
        .mockResolvedValueOnce(true)

      await renderAndCopyNote(wrapper)

      await waitFor(() => {
        expectClipboardWrite(1, expect.stringContaining('<p>Test content</p>'), 'html')
        expectClipboardWrite(2, 'Test content', 'plainText')
        expectClipboardWrite(3, 'Test content')
        expectCopyFailureLog('html', 'html unsupported')
        expectCopyFailureLog('plainTextFormatted', 'formatted plain unsupported')
        expect(Toast.show).toHaveBeenCalledWith({ type: 'success', text1: 'Note copied' })
      })
    })

    it('shows an error toast when both HTML and plain-text clipboard writes fail', async () => {
      ;(Clipboard.setStringAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('html unsupported'))
        .mockRejectedValueOnce(new Error('plain unsupported'))
        .mockRejectedValueOnce(new Error('legacy plain unsupported'))

      await renderAndCopyNote(wrapper)

      await waitFor(() => {
        expectClipboardWrite(1, expect.stringContaining('<p>Test content</p>'), 'html')
        expectClipboardWrite(2, 'Test content', 'plainText')
        expectClipboardWrite(3, 'Test content')
        expectCopyFailureLog('html', 'html unsupported')
        expectCopyFailureLog('plainTextFormatted', 'plain unsupported')
        expectCopyFailureLog('plainTextLegacy', 'legacy plain unsupported')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[NoteCopy] fatal copy failed', {
          name: 'Error',
          message: 'legacy plain unsupported',
        })
        expect(Toast.show).toHaveBeenCalledWith({ type: 'error', text1: 'Failed to copy note' })
      })
    })

    it('opens note index menu from more options and forwards note id', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(screen.getByTestId('note-index-menu-visibility').props.children).toBe('hidden')
      expect(screen.getByTestId('note-index-menu-note-id').props.children).toBe('test-note-id')

      fireEvent.press(screen.getByLabelText('More options'))

      await waitFor(() => {
        expect(screen.getByTestId('note-index-menu-visibility').props.children).toBe('visible')
      })

      fireEvent.press(screen.getByLabelText('Close note index menu'))

      await waitFor(() => {
        expect(screen.getByTestId('note-index-menu-visibility').props.children).toBe('hidden')
      })
    })

    it('opens share note dialog from the note options menu', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(screen.getByTestId('share-note-dialog-visibility').props.children).toBe('hidden')
      expect(screen.getByTestId('share-note-dialog-note-id').props.children).toBe('test-note-id')

      fireEvent.press(screen.getByLabelText('More options'))
      fireEvent.press(screen.getByLabelText('Share note'))

      await waitFor(() => {
        expect(screen.getByTestId('note-index-menu-visibility').props.children).toBe('hidden')
        expect(screen.getByTestId('share-note-dialog-visibility').props.children).toBe('visible')
      })

      fireEvent.press(screen.getByLabelText('Close share note'))

      await waitFor(() => {
        expect(screen.getByTestId('share-note-dialog-visibility').props.children).toBe('hidden')
      })
    })

    it('opens WordPress publish dialog from the note options menu', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(screen.getByTestId('wordpress-publish-dialog-visibility').props.children).toBe('hidden')

      fireEvent.press(screen.getByLabelText('More options'))
      fireEvent.press(screen.getByLabelText('Export to WordPress'))

      await waitFor(() => {
        expect(screen.getByTestId('note-index-menu-visibility').props.children).toBe('hidden')
        expect(screen.getByTestId('wordpress-publish-dialog-visibility').props.children).toBe('visible')
        expect(screen.getByTestId('wordpress-publish-dialog-note-id').props.children).toBe('test-note-id')
        expect(screen.getByTestId('wordpress-publish-dialog-title').props.children).toBe('wp-title:Test Note')
      })

      fireEvent.press(screen.getByLabelText('Close WordPress publish'))

      await waitFor(() => {
        expect(screen.getByTestId('wordpress-publish-dialog-visibility').props.children).toBe('hidden')
      })
    })
  })

  describe('Chunk focus', () => {
    it('retries chunk focus when the editor becomes ready without replacing the current route', async () => {
      mockLocalSearchParams = {
        id: 'test-note-id',
        focusOffset: '14',
        focusLength: '5',
        focusRequestId: 'focus-request-1',
      }

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(mockScrollToChunk).not.toHaveBeenCalled()

      act(() => {
        mockEditorCallbacks.onReady?.()
      })

      await waitFor(() => {
        expect(mockScrollToChunk).toHaveBeenCalledWith(14, 5)
      })

      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('applies the same chunk focus again when reopening the same note', async () => {
      mockLocalSearchParams = {
        id: 'test-note-id',
        focusOffset: '14',
        focusLength: '5',
        focusRequestId: 'focus-request-1',
      }

      const firstRender = render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      act(() => {
        mockEditorCallbacks.onReady?.()
      })

      await waitFor(() => {
        expect(mockScrollToChunk).toHaveBeenCalledTimes(1)
      })

      firstRender.unmount()

      mockScrollToChunk.mockClear()
      mockEditorCallbacks.onReady = undefined

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      act(() => {
        mockEditorCallbacks.onReady?.()
      })

      await waitFor(() => {
        expect(mockScrollToChunk).toHaveBeenCalledTimes(1)
        expect(mockScrollToChunk).toHaveBeenCalledWith(14, 5)
      })
    })

    it('keeps chunk focus working when switching notes without a second editor ready event', async () => {
      mockNoteService.prototype.getNoteStatus = jest.fn().mockImplementation(async (noteId: string) => {
        if (noteId === 'other-note-id') {
          return {
            status: 'found',
            note: {
              ...defaultNote,
              id: 'other-note-id',
              title: 'Other Note',
            },
          }
        }

        return {
          status: 'found',
          note: defaultNote,
        }
      })

      mockLocalSearchParams = {
        id: 'test-note-id',
        focusOffset: '14',
        focusLength: '5',
        focusRequestId: 'focus-request-1',
      }

      const rendered = render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      act(() => {
        mockEditorCallbacks.onReady?.()
      })

      await waitFor(() => {
        expect(mockScrollToChunk).toHaveBeenCalledWith(14, 5)
      })

      mockScrollToChunk.mockClear()
      mockLocalSearchParams = {
        id: 'other-note-id',
        focusOffset: '22',
        focusLength: '4',
        focusRequestId: 'focus-request-2',
      }

      rendered.rerender(<NoteEditorScreen />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Other Note')).toBeTruthy()
      })

      await waitFor(() => {
        expect(mockScrollToChunk).toHaveBeenCalledWith(22, 4)
      })
    })
  })

  describe('Toolbar visibility', () => {
    it('keeps toolbar visible while menu is open after editor blur', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      expect(screen.queryByTestId('editor-toolbar')).toBeNull()

      act(() => {
        mockEditorCallbacks.onFocus?.()
      })
      expect(screen.queryByTestId('editor-toolbar')).toBeTruthy()

      act(() => {
        mockToolbarCallbacks.onMenuVisibilityChange?.(true)
      })

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })
      expect(screen.queryByTestId('editor-toolbar')).toBeTruthy()

      act(() => {
        mockToolbarCallbacks.onMenuVisibilityChange?.(false)
      })
      expect(screen.queryByTestId('editor-toolbar')).toBeNull()
    })
  })

  describe('Content save on blur', () => {
    it('flushes pending content save when editor loses focus', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Simulate content change (this would normally come from paste or typing)
      act(() => {
        mockEditorCallbacks.onContentChange?.('<p>Pasted content</p>')
      })

      // Simulate blur - this should trigger immediate save
      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      await waitFor(() => {
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith(
          'test-note-id',
          expect.objectContaining({ description: '<p>Pasted content</p>' })
        )
      })
    })

    it('does not call updateNote on blur if no pending content', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Clear any previous calls
      mockNoteService.prototype.updateNote.mockClear()

      // Simulate blur without any content change
      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      // Give time for any async operations
      await new Promise(resolve => setTimeout(resolve, 50))

      // updateNote should not be called since there's no pending content
      expect(mockNoteService.prototype.updateNote).not.toHaveBeenCalled()
    })

    it('does not call updateNote on blur after debounced save flushes', async () => {
      jest.useFakeTimers()

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      act(() => {
        mockEditorCallbacks.onContentChange?.('<p>Saved content</p>')
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      await waitFor(() => {
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledTimes(1)
      })

      jest.useRealTimers()
    })

    it('clears pending timeout on blur to avoid duplicate saves', async () => {
      jest.useFakeTimers()

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Simulate content change - this starts debounce timer
      act(() => {
        mockEditorCallbacks.onContentChange?.('<p>New content</p>')
      })

      // Immediately blur - should flush and clear timeout
      act(() => {
        mockEditorCallbacks.onBlur?.()
      })

      // Advance timers past debounce period
      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        // Should be called exactly once (from blur), not twice (blur + debounce)
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledTimes(1)
      })

      jest.useRealTimers()
    })

    it('flushes pending content on unmount', async () => {
      const { unmount } = render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      act(() => {
        mockEditorCallbacks.onContentChange?.('<p>Pending content</p>')
      })

      act(() => {
        unmount()
      })

      await waitFor(() => {
        expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith(
          'test-note-id',
          expect.objectContaining({ description: '<p>Pending content</p>' })
        )
      })
    })
  })
})
