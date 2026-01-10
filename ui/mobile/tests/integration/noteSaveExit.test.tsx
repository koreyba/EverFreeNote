import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import {
  act,
  createMockNote,
  createMockNoteService,
  createMockNoteServiceState,
  createQueryWrapper,
  createTestQueryClient,
  render,
  screen,
  waitFor,
} from '../testUtils'

const mockPush = jest.fn()
const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockUseLocalSearchParams = jest.fn(() => ({ id: 'note-id' }))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  Stack: {
    Screen: ({ children, options }: { children: ReactNode; options?: { headerRight?: () => ReactNode; headerLeft?: () => ReactNode } }) => {
      const { View } = require('react-native')
      return (
        <View>
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

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'note-id',
            title: 'Test Note',
            description: '',
            tags: [],
            created_at: '2025-01-01T10:00:00.000Z',
            updated_at: '2025-01-01T10:00:00.000Z',
            user_id: 'test-user-id',
          },
          error: null,
        }),
      })),
    },
    user: { id: 'test-user-id' },
  })),
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

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
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

const mockEditorCallbacks: {
  onContentChange?: (html: string) => void
} = {}

const mockEditorState: {
  initialContent: string
} = {
  initialContent: '',
}

jest.mock('@ui/mobile/components/EditorWebView', () => {
  const React = require('react')
  const { View, Text } = require('react-native')

  return React.forwardRef((props: { initialContent?: string; onContentChange?: (html: string) => void }, ref: unknown) => {
    mockEditorCallbacks.onContentChange = props.onContentChange
    mockEditorState.initialContent = props.initialContent ?? ''

    React.useImperativeHandle(ref, () => ({
      runCommand: jest.fn(),
    }))

    return (
      <View testID="editor-webview">
        <Text>Editor Content</Text>
      </View>
    )
  })
})

jest.mock('@ui/mobile/components/EditorToolbar', () => ({
  EditorToolbar: () => {
    const { View, Text } = require('react-native')
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

import NoteEditorScreen from '@ui/mobile/app/note/[id]'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>

type ExitMode = 'ui-back' | 'hardware-back'
type InputMode = 'paste' | 'typing'

const setupNoteState = (note: Note) => {
  const state = createMockNoteServiceState([note])
  const service = createMockNoteService(state)

  mockNoteService.prototype.getNote = service.getNote
  mockNoteService.prototype.updateNote = service.updateNote
  mockNoteService.prototype.deleteNote = service.deleteNote

  return state
}

const renderNoteEditor = (noteId: string) => {
  const queryClient = createTestQueryClient()
  const wrapper = createQueryWrapper(queryClient)
  mockUseLocalSearchParams.mockReturnValue({ id: noteId })
  return {
    ...render(<NoteEditorScreen />, { wrapper }),
    queryClient,
  }
}

const waitForEditorReady = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('editor-webview')).toBeTruthy()
  })
}

const simulateExit = (mode: ExitMode, unmount: () => void) => {
  if (mode === 'ui-back') {
    mockBack()
  } else {
    mockBack()
  }
  unmount()
}

describe('NoteEditorScreen - save on exit', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    mockEditorCallbacks.onContentChange = undefined
    mockEditorState.initialContent = ''
    mockUseLocalSearchParams.mockReturnValue({ id: 'note-id' })
    jest.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const exitModes: ExitMode[] = ['ui-back', 'hardware-back']
  const inputModes: { mode: InputMode; html: string }[] = [
    { mode: 'paste', html: '<p>Pasted text</p>' },
    { mode: 'typing', html: '<p>Typed text</p>' },
  ]

  describe.each(exitModes)('new note with %s', (exitMode) => {
    it.each(inputModes)('saves %s content and restores on reopen', async ({ html }) => {
      const note = createMockNote({ id: 'note-new', description: '' })
      const state = setupNoteState(note)

      const { unmount } = renderNoteEditor(note.id)
      await waitForEditorReady()

      act(() => {
        mockEditorCallbacks.onContentChange?.(html)
      })

      act(() => {
        simulateExit(exitMode, unmount)
      })

      await waitFor(() => {
        expect(state.updatedNotes.get(note.id)?.description).toBe(html)
      })

      const reopened = renderNoteEditor(note.id)
      await waitForEditorReady()

      await waitFor(() => {
        expect(mockEditorState.initialContent).toBe(html)
      })
      reopened.unmount()
    })
  })

  describe.each(exitModes)('existing note with %s', (exitMode) => {
    it.each(inputModes)('saves %s content and restores on reopen', async ({ html }) => {
      const note = createMockNote({ id: 'note-existing', description: '<p>Existing</p>' })
      const state = setupNoteState(note)

      const { unmount } = renderNoteEditor(note.id)
      await waitForEditorReady()

      act(() => {
        mockEditorCallbacks.onContentChange?.(html)
      })

      act(() => {
        simulateExit(exitMode, unmount)
      })

      await waitFor(() => {
        expect(state.updatedNotes.get(note.id)?.description).toBe(html)
      })

      const reopened = renderNoteEditor(note.id)
      await waitForEditorReady()

      await waitFor(() => {
        expect(mockEditorState.initialContent).toBe(html)
      })
      reopened.unmount()
    })
  })
})
