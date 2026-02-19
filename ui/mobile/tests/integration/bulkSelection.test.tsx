/**
 * Integration tests for bulk selection on the Notes screen
 * Tests: selection mode activation, toggle behavior, Select All, and full delete flow
 */
import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  createQueryWrapper,
  createTestQueryClient,
  act,
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
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
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
      rpc: jest.fn(() => Promise.resolve({ data: [], error: null, count: null, status: 200, statusText: 'OK' })),
    },
    user: { id: 'test-user-id' },
  })),
  useTheme: () => ({
    colors: {
      background: '#ffffff', foreground: '#111111', card: '#ffffff',
      border: '#e0e0e0', accent: '#f2f2f2', primary: '#00aa00',
      secondary: '#f7f7f7', mutedForeground: '#666666',
      destructive: '#ff0000', destructiveForeground: '#ffffff',
      primaryForeground: '#ffffff',
    },
  }),
  useSwipeContext: () => ({
    register: jest.fn(), unregister: jest.fn(),
    closeAll: jest.fn(), onSwipeStart: jest.fn(),
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

// SwipeableNoteCard mock that supports selection mode
jest.mock('@ui/mobile/components/SwipeableNoteCard', () => ({
  SwipeableNoteCard: ({
    note,
    onPress,
    onLongPress,
    onDelete,
    isSelectionMode,
    isSelected,
  }: {
    note: { id: string; title: string }
    onPress: (note: { id: string; title: string }) => void
    onLongPress?: () => void
    onDelete: (id: string) => void
    isSelectionMode?: boolean
    isSelected?: boolean
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
          <Pressable testID={`delete-button-${note.id}`} onPress={() => onDelete(note.id)}>
            <Text>Delete</Text>
          </Pressable>
        )}
      </View>
    )
  },
}))

// BulkActionBar mock that exposes testable buttons
jest.mock('@ui/mobile/components/BulkActionBar', () => ({
  BulkActionBar: ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onDelete,
    isPending,
  }: {
    selectedCount: number
    totalCount: number
    onSelectAll: () => void
    onDeselectAll: () => void
    onDelete: () => void
    isPending: boolean
  }) => {
    const { View, Text, Pressable } = require('react-native')
    const allSelected = selectedCount === totalCount && totalCount > 0
    return (
      <View testID="bulk-action-bar">
        <Text testID="bulk-selected-count">{selectedCount} selected</Text>
        <Pressable
          testID="bulk-select-all-btn"
          onPress={allSelected ? onDeselectAll : onSelectAll}
        >
          <Text>{allSelected ? 'Deselect All' : `Select All (${totalCount})`}</Text>
        </Pressable>
        <Pressable
          testID="bulk-delete-btn"
          onPress={onDelete}
          disabled={selectedCount === 0 || isPending}
        >
          <Text>Delete</Text>
        </Pressable>
      </View>
    )
  },
}))

// FlashList mock
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, keyExtractor }: {
    data: unknown[]
    renderItem: (info: { item: unknown }) => React.ReactElement
    keyExtractor: (item: unknown) => string
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

const mockNotes = [
  {
    id: 'note-1', title: 'First Note', description: 'Content 1',
    tags: ['tag1'], created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-01T10:00:00.000Z', user_id: 'test-user-id',
  },
  {
    id: 'note-2', title: 'Second Note', description: 'Content 2',
    tags: ['tag2'], created_at: '2025-01-02T10:00:00.000Z',
    updated_at: '2025-01-02T10:00:00.000Z', user_id: 'test-user-id',
  },
]

describe('NotesScreen - Bulk Selection', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)

    mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
      notes: mockNotes,
      hasMore: false,
      totalCount: mockNotes.length,
    })
    mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted')

    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('long press activates selection mode and shows BulkActionBar', async () => {
    render(<NotesScreen />, { wrapper })

    await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

    fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')

    await waitFor(() => expect(screen.getByTestId('bulk-action-bar')).toBeTruthy())
  })

  it('long press selects the pressed note and shows checkboxes on all cards', async () => {
    render(<NotesScreen />, { wrapper })

    await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

    fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')

    await waitFor(() => {
      expect(screen.getByTestId('note-checkbox-note-1')).toBeTruthy()
      expect(screen.getByTestId('note-checkbox-note-2')).toBeTruthy()
    })

    expect(screen.getByTestId('note-checkbox-note-1').children[0]).toBeTruthy()
    expect(screen.getByText('checked')).toBeTruthy()   // note-1 is selected
    expect(screen.getAllByText('unchecked')).toHaveLength(1) // note-2 is not
  })

  it('tap in selection mode toggles note, does not navigate', async () => {
    render(<NotesScreen />, { wrapper })

    await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

    // Enter selection mode via long press
    fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')
    await waitFor(() => expect(screen.getByTestId('bulk-action-bar')).toBeTruthy())

    // Tap note-1 to deselect it
    fireEvent.press(screen.getByTestId('note-press-note-1'))

    await waitFor(() => {
      expect(screen.getByTestId('note-checkbox-note-1')).toBeTruthy()
    })

    // Navigation should NOT have happened
    expect(mockPush).not.toHaveBeenCalled()
    // note-1 deselected → all unchecked
    expect(screen.getAllByText('unchecked')).toHaveLength(2)
  })

  it('Select All button selects all loaded notes', async () => {
    render(<NotesScreen />, { wrapper })

    await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

    // Enter selection mode (only note-1 selected)
    fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')
    await waitFor(() => expect(screen.getByTestId('bulk-select-all-btn')).toBeTruthy())

    // Press Select All
    fireEvent.press(screen.getByTestId('bulk-select-all-btn'))

    await waitFor(() => {
      expect(screen.getAllByText('checked')).toHaveLength(2)
    })
    expect(screen.queryByText('unchecked')).toBeNull()
  })

  it('full delete flow: confirm alert → deleteNote called → selection mode exits', async () => {
    render(<NotesScreen />, { wrapper })

    await waitFor(() => expect(screen.getByText('First Note')).toBeTruthy())

    // Enter selection mode (note-1 selected)
    fireEvent(screen.getByTestId('note-press-note-1'), 'longPress')
    await waitFor(() => expect(screen.getByTestId('bulk-delete-btn')).toBeTruthy())

    // Press Delete
    fireEvent.press(screen.getByTestId('bulk-delete-btn'))

    // Alert should be shown with count
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
      'Delete notes',
      'Delete 1 note?',
      expect.any(Array)
    ))

    // Confirm deletion
    const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{ text: string; onPress?: () => Promise<void> }>
    const confirmBtn = alertButtons.find(b => b.text === 'Delete')
    await act_util(async () => {
      await confirmBtn?.onPress?.()
    })

    // deleteNote called with the selected note id
    await waitFor(() =>
      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('note-1')
    )

    // BulkActionBar should be gone (selection mode exited)
    await waitFor(() =>
      expect(screen.queryByTestId('bulk-action-bar')).toBeNull()
    )
  })
})

async function act_util(fn: () => Promise<void>) {
  await act(fn)
}
