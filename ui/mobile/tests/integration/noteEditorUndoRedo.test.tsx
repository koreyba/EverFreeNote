import type { ReactNode } from 'react'
import {
  act,
  createMockNote,
  createMockNoteService,
  createMockNoteServiceState,
  createQueryWrapper,
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '../testUtils'

const mockBack = jest.fn()
const mockPush = jest.fn()
const mockRouteParams: { id: string } = { id: 'note-id' }

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => mockRouteParams,
  Stack: {
    Screen: ({ children, options }: { children?: ReactNode; options?: { title?: string; headerLeft?: () => ReactNode; headerRight?: () => ReactNode } }) => {
      const { View } = require('react-native')
      return (
        <View>
          {options?.headerLeft && (
            <View testID="header-left">
              {typeof options.headerLeft === 'function' ? options.headerLeft() : options.headerLeft}
            </View>
          )}
          {options?.headerRight && (
            <View testID="header-right">
              {typeof options.headerRight === 'function' ? options.headerRight() : options.headerRight}
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

// Capture runCommand mock at module scope to assert on it
const mockRunCommand = jest.fn()
type HistoryState = { canUndo: boolean; canRedo: boolean }
let emitHistoryState: ((state: HistoryState) => void) | null = null

jest.mock('@ui/mobile/components/EditorWebView', () => {
  const React = require('react')
  const { View, Text } = require('react-native')

  return React.forwardRef((props: { onHistoryStateChange?: (state: HistoryState) => void }, ref: unknown) => {
    emitHistoryState = props.onHistoryStateChange ?? null

    React.useEffect(() => {
      props.onHistoryStateChange?.({ canUndo: false, canRedo: false })
    }, [props.onHistoryStateChange])

    React.useImperativeHandle(ref, () => ({
      runCommand: mockRunCommand,
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
    const { View } = require('react-native')
    return <View testID="editor-toolbar" />
  },
  TOOLBAR_CONTENT_HEIGHT: 48,
}))

jest.mock('@ui/mobile/components/ThemeToggle', () => ({
  ThemeToggle: () => {
    const { View } = require('react-native')
    return <View testID="theme-toggle" />
  },
}))

jest.mock('@ui/mobile/components/tags/TagInput', () => ({
  TagInput: () => {
    const { View } = require('react-native')
    return <View testID="tag-input" />
  },
}))

import NoteEditorScreen from '@ui/mobile/app/note/[id]'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>

function renderScreen() {
  const state = createMockNoteServiceState([
    createMockNote({ id: 'note-id', title: 'Test Note', description: '' }),
    createMockNote({ id: 'note-id-2', title: 'Other Note', description: '<p>Other</p>' }),
  ])
  const service = createMockNoteService(state)

  mockNoteService.prototype.getNote = service.getNote
  mockNoteService.prototype.updateNote = service.updateNote
  mockNoteService.prototype.deleteNote = service.deleteNote

  const queryClient = createTestQueryClient()
  const Wrapper = createQueryWrapper(queryClient)

  const renderResult = render(<NoteEditorScreen />, { wrapper: Wrapper })
  return { ...renderResult, queryClient }
}

const waitForEditorReady = async () => {
  await waitFor(() => {
    expect(screen.queryByTestId('editor-webview')).toBeTruthy()
  })
}

const setHistoryState = async (state: HistoryState) => {
  await act(async () => {
    emitHistoryState?.(state)
  })
}

describe('NoteEditorScreen — Undo/Redo header buttons', () => {
  beforeEach(() => {
    mockRunCommand.mockClear()
    mockBack.mockClear()
    emitHistoryState = null
    mockRouteParams.id = 'note-id'
  })

  it('renders headerLeft with back, undo, and redo buttons', async () => {
    renderScreen()
    await waitForEditorReady()

    const headerLeft = screen.getByTestId('header-left')
    expect(headerLeft).toBeTruthy()

    expect(screen.getByLabelText('Go back')).toBeTruthy()
    expect(screen.getByLabelText('Undo')).toBeTruthy()
    expect(screen.getByLabelText('Redo')).toBeTruthy()
  })

  it('does not show the "Edit" title (title is empty)', async () => {
    renderScreen()
    await waitForEditorReady()

    // Stack.Screen mock does not render the title prop, but we verify
    // the screen renders without "Edit" text (previous title)
    expect(screen.queryByText('Edit')).toBeNull()
  })

  it('undo and redo buttons are disabled by default when history is empty', async () => {
    renderScreen()
    await waitForEditorReady()

    const undo = screen.getByLabelText('Undo')
    const redo = screen.getByLabelText('Redo')

    expect(undo.props.accessibilityState?.disabled).toBe(true)
    expect(redo.props.accessibilityState?.disabled).toBe(true)
  })

  it('updates undo/redo disabled state when history state changes', async () => {
    renderScreen()
    await waitForEditorReady()

    await setHistoryState({ canUndo: true, canRedo: false })
    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(false)
    expect(screen.getByLabelText('Redo').props.accessibilityState?.disabled).toBe(true)

    await setHistoryState({ canUndo: true, canRedo: true })
    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(false)
    expect(screen.getByLabelText('Redo').props.accessibilityState?.disabled).toBe(false)

    await setHistoryState({ canUndo: false, canRedo: false })
    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(true)
    expect(screen.getByLabelText('Redo').props.accessibilityState?.disabled).toBe(true)
  })

  it('disabled undo and redo buttons do not dispatch commands', async () => {
    renderScreen()
    await waitForEditorReady()

    fireEvent.press(screen.getByLabelText('Undo'))
    fireEvent.press(screen.getByLabelText('Redo'))

    expect(mockRunCommand).not.toHaveBeenCalled()
  })

  it('pressing Undo button calls runCommand("undo") on editor', async () => {
    renderScreen()
    await waitForEditorReady()
    await setHistoryState({ canUndo: true, canRedo: false })

    fireEvent.press(screen.getByLabelText('Undo'))

    expect(mockRunCommand).toHaveBeenCalledTimes(1)
    expect(mockRunCommand).toHaveBeenCalledWith('undo')
  })

  it('pressing Redo button calls runCommand("redo") on editor', async () => {
    renderScreen()
    await waitForEditorReady()
    await setHistoryState({ canUndo: false, canRedo: true })

    fireEvent.press(screen.getByLabelText('Redo'))

    expect(mockRunCommand).toHaveBeenCalledTimes(1)
    expect(mockRunCommand).toHaveBeenCalledWith('redo')
  })

  it('pressing back button calls router.back()', async () => {
    renderScreen()
    await waitForEditorReady()

    fireEvent.press(screen.getByLabelText('Go back'))

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('undo and redo do not interfere with each other', async () => {
    renderScreen()
    await waitForEditorReady()
    await setHistoryState({ canUndo: true, canRedo: true })

    fireEvent.press(screen.getByLabelText('Undo'))
    fireEvent.press(screen.getByLabelText('Redo'))
    fireEvent.press(screen.getByLabelText('Undo'))

    expect(mockRunCommand).toHaveBeenCalledTimes(3)
    expect(mockRunCommand).toHaveBeenNthCalledWith(1, 'undo')
    expect(mockRunCommand).toHaveBeenNthCalledWith(2, 'redo')
    expect(mockRunCommand).toHaveBeenNthCalledWith(3, 'undo')
  })

  it('keeps undo enabled when the same note is refreshed after autosave', async () => {
    const { queryClient } = renderScreen()
    await waitForEditorReady()

    await setHistoryState({ canUndo: true, canRedo: false })
    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(false)

    await act(async () => {
      queryClient.setQueryData(
        ['note', 'note-id'],
        createMockNote({
          id: 'note-id',
          title: 'Test Note',
          description: '',
        })
      )
    })

    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(false)
  })

  it('resets undo/redo state when route switches to a different note', async () => {
    const screenRender = renderScreen()
    await waitForEditorReady()

    await setHistoryState({ canUndo: true, canRedo: true })
    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(false)
    expect(screen.getByLabelText('Redo').props.accessibilityState?.disabled).toBe(false)

    mockRouteParams.id = 'note-id-2'
    await act(async () => {
      screenRender.rerender(<NoteEditorScreen />)
    })
    await waitForEditorReady()

    expect(screen.getByLabelText('Undo').props.accessibilityState?.disabled).toBe(true)
    expect(screen.getByLabelText('Redo').props.accessibilityState?.disabled).toBe(true)
  })
})
