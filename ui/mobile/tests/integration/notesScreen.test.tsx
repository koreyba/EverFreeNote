/**
 * Integration tests for NotesScreen delete functionality
 * Tests swipe-to-delete from notes list, error alerts, and list updates
 */
import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  act,
  createQueryWrapper,
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '../testUtils'
import { Alert } from 'react-native'

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())

// Mock expo-router
const mockPush = jest.fn()
const mockBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}))

// Mock providers
jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'note-1',
              title: 'First Note',
              description: 'Content 1',
              tags: ['tag1'],
              created_at: '2025-01-01T10:00:00.000Z',
              updated_at: '2025-01-01T10:00:00.000Z',
              user_id: 'test-user-id',
            },
            {
              id: 'note-2',
              title: 'Second Note',
              description: 'Content 2',
              tags: ['tag2'],
              created_at: '2025-01-02T10:00:00.000Z',
              updated_at: '2025-01-02T10:00:00.000Z',
              user_id: 'test-user-id',
            },
          ],
          error: null,
        }),
      })),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        })
      ),
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
  useSwipeContext: () => ({
    register: jest.fn(),
    unregister: jest.fn(),
    closeAll: jest.fn(),
    onSwipeStart: jest.fn(),
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

// Mock SwipeableNoteCard with simplified implementation
jest.mock('@ui/mobile/components/SwipeableNoteCard', () => ({
  SwipeableNoteCard: ({
    note, onPress, onLongPress, onDelete, isSelectionMode, isSelected,
  }: {
    note: { id: string; title: string };
    onPress: (note: { id: string; title: string }) => void;
    onLongPress?: () => void;
    onDelete: (id: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={`note-card-${note.id}`}>
        <Pressable
          testID={`note-press-${note.id}`}
          onPress={() => onPress(note)}
          onLongPress={onLongPress}
        >
          <Text>{note.title}</Text>
          {isSelectionMode && (
            <Text testID={`note-checkbox-${note.id}`}>
              {isSelected ? 'checked' : 'unchecked'}
            </Text>
          )}
        </Pressable>
        {!isSelectionMode && (
          <Pressable
            testID={`delete-button-${note.id}`}
            onPress={() => onDelete(note.id)}
            accessibilityLabel={`Delete ${note.title}`}
          >
            <Text>Delete</Text>
          </Pressable>
        )}
      </View>
    )
  },
}))

// Mock BulkActionBar
jest.mock('@ui/mobile/components/BulkActionBar', () => ({
  BulkActionBar: ({ selectedCount, onDelete }: { selectedCount: number; onDelete: () => void }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID="bulk-action-bar">
        <Text>{selectedCount} selected</Text>
        <Pressable testID="bulk-delete-button" onPress={onDelete}>
          <Text>Delete</Text>
        </Pressable>
      </View>
    )
  },
}))

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, keyExtractor }: {
    data: unknown[];
    renderItem: (info: { item: unknown }) => React.ReactElement;
    keyExtractor: (item: unknown) => string;
  }) => {
    const { View } = require('react-native')
    return (
      <View testID="flash-list">
        {data?.map((item: unknown) => (
          <View key={keyExtractor(item)}>
            {renderItem({ item })}
          </View>
        ))}
      </View>
    )
  },
}))

import NotesScreen from '@ui/mobile/app/(tabs)/index'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>

describe('NotesScreen - Delete Functionality', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  const mockNotes = [
    {
      id: 'note-1',
      title: 'First Note',
      description: 'Content 1',
      tags: ['tag1'],
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z',
      user_id: 'test-user-id',
    },
    {
      id: 'note-2',
      title: 'Second Note',
      description: 'Content 2',
      tags: ['tag2'],
      created_at: '2025-01-02T10:00:00.000Z',
      updated_at: '2025-01-02T10:00:00.000Z',
      user_id: 'test-user-id',
    },
  ]

  beforeEach(() => {
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)

    mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
      notes: mockNotes,
      hasMore: false,
      totalCount: mockNotes.length,
    })

    mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted-note-id')

    jest.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Swipe to delete', () => {
    it('renders delete buttons for each note', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      expect(screen.getByTestId('delete-button-note-1')).toBeTruthy()
      expect(screen.getByTestId('delete-button-note-2')).toBeTruthy()
    })

    it('deletes note when swipe delete is triggered', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('note-1')
      })
    })

    it('removes deleted note from list', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('First Note')).toBeNull()
      })

      // Second note should still be visible
      expect(screen.getByText('Second Note')).toBeTruthy()
    })

    it('deletes correct note when multiple notes exist', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('Second Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-2')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('note-2')
      })

      await waitFor(() => {
        expect(screen.queryByText('Second Note')).toBeNull()
      })

      expect(screen.getByText('First Note')).toBeTruthy()
    })
  })

  describe('Delete error handling', () => {
    it('falls back to queue when API deletion fails (no alert shown)', async () => {
      const error = new Error('Network error')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      // Wait for API call
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // No alert should be shown - fallback to queue succeeded
      expect(Alert.alert).not.toHaveBeenCalled()

      // Note should be removed (optimistic update stays)
      await waitFor(() => {
        expect(screen.queryByText('First Note')).toBeNull()
      })
    })

    it('keeps note deleted when API fails but fallback succeeds', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      // Wait for API call and fallback
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Note should be deleted (fallback succeeded, optimistic update stays)
      await waitFor(() => {
        expect(screen.queryByText('First Note')).toBeNull()
      })
    })

    it('deletes successfully on first attempt via fallback', async () => {
      const error = new Error('Network error')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')

      // First attempt - API fails but fallback succeeds
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Note should be deleted (no retry needed - fallback worked)
      await waitFor(() => {
        expect(screen.queryByText('First Note')).toBeNull()
      })

      // No alert shown
      expect(Alert.alert).not.toHaveBeenCalled()
    })
  })

  describe('Navigation integration', () => {
    it('navigates to note editor when note is pressed', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      fireEvent.press(screen.getByText('First Note'))

      expect(mockPush).toHaveBeenCalledWith('/note/note-1')
    })

    it('does not navigate when delete button is pressed', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Create note integration', () => {
    it('renders create note button', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const createButton = screen.getByLabelText('Create new note')
      expect(createButton).toBeTruthy()
    })

    it('creates note and navigates to editor', async () => {
      mockNoteService.prototype.createNote = jest.fn().mockResolvedValue({
        id: 'new-note-id',
        title: 'New note',
        description: '',
        tags: [],
        created_at: '2025-01-03T10:00:00.000Z',
        updated_at: '2025-01-03T10:00:00.000Z',
        user_id: 'test-user-id',
      })

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const createButton = screen.getByLabelText('Create new note')
      fireEvent.press(createButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/note/new-note-id')
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty state when all notes are deleted', async () => {
      mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
        notes: [mockNotes[0]],
        hasMore: false,
        totalCount: 1,
      })

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('First Note')).toBeNull()
      })

      // When all notes are deleted via optimistic update, component shows empty state
      await waitFor(() => {
        expect(screen.getByText('No notes yet')).toBeTruthy()
      })
    })
  })

  describe('Loading states', () => {
    it('shows loading indicator while fetching notes', () => {
      const notesPromise = new Promise(() => {
        // Never resolves
      })

      mockNoteService.prototype.getNotes = jest.fn().mockReturnValue(notesPromise)

      render(<NotesScreen />, { wrapper })

      expect(screen.getByTestId('activity-indicator')).toBeTruthy()
    })

    it('hides loading indicator after notes are loaded', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      expect(screen.queryByTestId('activity-indicator')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('has correct accessibility labels for delete buttons', async () => {
      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton1 = screen.getByLabelText('Delete First Note')
      const deleteButton2 = screen.getByLabelText('Delete Second Note')

      expect(deleteButton1).toBeTruthy()
      expect(deleteButton2).toBeTruthy()
    })
  })

  describe('Pull-to-refresh on empty state', () => {
    it('triggers refetch and shows notes after pull-to-refresh on empty state', async () => {
      mockNoteService.prototype.getNotes = jest.fn()
        .mockResolvedValueOnce({ notes: [], hasMore: false, totalCount: 0 })
        .mockResolvedValueOnce({ notes: mockNotes, hasMore: false, totalCount: mockNotes.length })

      render(<NotesScreen />, { wrapper })

      await waitFor(() => expect(screen.getByText('No notes yet')).toBeTruthy())

      const scrollView = screen.getByTestId('empty-state-scroll')
      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh()
      })

      await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())
    })

    it('shows loading indicator while refreshing from empty state', async () => {
      let resolveRefetch!: (value: unknown) => void
      const refetchPromise = new Promise(resolve => { resolveRefetch = resolve })

      mockNoteService.prototype.getNotes = jest.fn()
        .mockResolvedValueOnce({ notes: [], hasMore: false, totalCount: 0 })
        .mockReturnValueOnce(refetchPromise)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => expect(screen.getByText('No notes yet')).toBeTruthy())

      const scrollView = screen.getByTestId('empty-state-scroll')
      await act(async () => {
        await scrollView.props.refreshControl.props.onRefresh()
      })

      await waitFor(() => expect(screen.getByTestId('activity-indicator')).toBeTruthy())

      resolveRefetch({ notes: mockNotes, hasMore: false, totalCount: mockNotes.length })
      await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())
    })
  })

  describe('Bulk delete', () => {
    it('calls refetch after bulk delete completes', async () => {
      mockNoteService.prototype.getNotes = jest.fn()
        .mockResolvedValueOnce({ notes: mockNotes, hasMore: false, totalCount: mockNotes.length })
        .mockResolvedValueOnce({ notes: mockNotes, hasMore: false, totalCount: mockNotes.length })
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted')

      render(<NotesScreen />, { wrapper })

      await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

      fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')
      await waitFor(() => expect(screen.getByTestId('bulk-action-bar')).toBeTruthy())

      fireEvent.press(screen.getByTestId('bulk-delete-button'))

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const deleteAction = alertCall[2].find((b: { text: string }) => b.text === 'Delete')
      await act(async () => { await deleteAction.onPress() })

      await waitFor(() => {
        expect(mockNoteService.prototype.getNotes).toHaveBeenCalledTimes(2)
      })
    })

    it('shows empty state after bulk delete when server has no more notes', async () => {
      mockNoteService.prototype.getNotes = jest.fn()
        .mockResolvedValueOnce({ notes: mockNotes, hasMore: false, totalCount: mockNotes.length })
        .mockResolvedValueOnce({ notes: [], hasMore: false, totalCount: 0 })
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted')

      render(<NotesScreen />, { wrapper })

      await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

      fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')
      await waitFor(() => expect(screen.getByTestId('bulk-action-bar')).toBeTruthy())

      fireEvent.press(screen.getByTestId('bulk-delete-button'))

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const deleteAction = alertCall[2].find((b: { text: string }) => b.text === 'Delete')
      await act(async () => { await deleteAction.onPress() })

      await waitFor(() => expect(screen.getByText('No notes yet')).toBeTruthy())
    })
  })
})
