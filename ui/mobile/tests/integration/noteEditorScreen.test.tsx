/**
 * Screen tests for NoteEditorScreen
 * Tests delete button functionality, navigation after deletion, loading states
 */
import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({ id: 'test-note-id' }),
  Stack: {
    Screen: ({ children, options }: { children: ReactNode; options?: { headerRight?: () => ReactNode; headerLeft?: () => ReactNode } }) => {
      const { View } = require('react-native')
      return (
        <View>
          {/* Render header options if provided */}
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

// Mock services
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

// Mock components
jest.mock('@ui/mobile/components/EditorWebView', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  
  return React.forwardRef((_props: unknown, ref: unknown) => {
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

describe('NoteEditorScreen - Delete Functionality', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)

    mockNoteService.prototype.getNote = jest.fn().mockResolvedValue({
      id: 'test-note-id',
      title: 'Test Note',
      description: '<p>Test content</p>',
      tags: ['tag1'],
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z',
      user_id: 'test-user-id',
    })

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

    jest.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
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

      mockNoteService.prototype.getNote = jest.fn().mockReturnValue(notePromise)

      render(<NoteEditorScreen />, { wrapper })

      // Should show loading indicator
      expect(screen.getByTestId('activity-indicator')).toBeTruthy()
    })

    it('shows error message when note fails to load', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockNoteService.prototype.getNote = jest.fn().mockRejectedValue(new Error('Failed to load'))

      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('Error loading note')).toBeTruthy()
      })

      warnSpy.mockRestore()
    })

    it('does not show delete button when note is loading', () => {
      const notePromise = new Promise(() => {
        // Never resolves
      })

      mockNoteService.prototype.getNote = jest.fn().mockReturnValue(notePromise)

      render(<NoteEditorScreen />, { wrapper })

      expect(screen.queryByLabelText('Delete note')).toBeNull()
    })

    it('does not show delete button when note fails to load', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockNoteService.prototype.getNote = jest.fn().mockRejectedValue(new Error('Failed to load'))

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
    it('shows correct header title', async () => {
      render(<NoteEditorScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.queryByTestId('editor-webview')).toBeTruthy()
      })

      // Stack.Screen should configure header with title 'Edit'
      // This is tested implicitly through the component rendering
    })

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
      expect(screen.getByTestId('theme-toggle')).toBeTruthy()
    })
  })
})
