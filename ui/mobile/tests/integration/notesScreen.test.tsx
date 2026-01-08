/**
 * Integration tests for NotesScreen delete functionality
 * Tests swipe-to-delete from notes list, error alerts, and list updates
 */
import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
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
  SwipeableNoteCard: ({ note, onPress, onDelete }: { 
    note: { id: string; title: string }; 
    onPress: (note: { id: string; title: string }) => void;
    onDelete: (id: string) => void;
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={`note-card-${note.id}`}>
        <Pressable onPress={() => onPress(note)}>
          <Text>{note.title}</Text>
        </Pressable>
        <Pressable
          testID={`delete-button-${note.id}`}
          onPress={() => onDelete(note.id)}
          accessibilityLabel={`Delete ${note.title}`}
        >
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
    it('shows alert when deletion fails', async () => {
      const error = new Error('Network error')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete note. Please try again.'
        )
      })
    })

    it('restores note in list when deletion fails', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')
      fireEvent.press(deleteButton)

      // Wait for error to be processed
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // After error/rollback, note should still be visible
      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })
    })

    it('allows retrying deletion after error', async () => {
      const error = new Error('Network error')
      mockNoteService.prototype.deleteNote = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('note-1')

      render(<NotesScreen />, { wrapper })

      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-note-1')

      // First attempt - fails
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled()
      })

      // Note should still be visible after error
      expect(screen.getByText('First Note')).toBeTruthy()

      // Second attempt - succeeds
      fireEvent.press(deleteButton)

      // Wait for deletion to be called twice
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledTimes(2)
      })
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
})
