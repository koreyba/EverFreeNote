/**
 * Centralized test utilities for mobile app integration tests
 * Provides properly structured mocks with state tracking for React Query integration
 */
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'

// Re-export testing library utilities
export { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native'
export { renderHook } from '@testing-library/react-native'

/**
 * Creates a new QueryClient configured for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Creates a wrapper component for hooks that require QueryClientProvider
 */
export function createQueryWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

/**
 * Mock note factory - creates consistent test notes
 */
export function createMockNote(overrides: Partial<Note> = {}): Note {
  const id = overrides.id ?? `note-${Date.now()}`
  return {
    id,
    title: `Test Note ${id}`,
    description: `Description for ${id}`,
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'test-user-id',
    ...overrides,
  }
}

/**
 * Creates a set of mock notes for testing
 */
export function createMockNotes(count: number = 3): Note[] {
  return Array.from({ length: count }, (_, i) => createMockNote({
    id: `note-${i + 1}`,
    title: `Note ${i + 1}`,
    description: `Description ${i + 1}`,
    tags: [`tag${i + 1}`],
    created_at: `2025-01-0${i + 1}T10:00:00.000Z`,
    updated_at: `2025-01-0${i + 1}T10:00:00.000Z`,
  }))
}

/**
 * Note service mock state manager
 * Tracks deletions, creations, and updates across test execution
 */
export interface MockNoteServiceState {
  notes: Note[]
  deletedIds: Set<string>
  createdNotes: Note[]
  updatedNotes: Map<string, Partial<Note>>
}

export function createMockNoteServiceState(initialNotes: Note[] = []): MockNoteServiceState {
  return {
    notes: [...initialNotes],
    deletedIds: new Set(),
    createdNotes: [],
    updatedNotes: new Map(),
  }
}

/**
 * Creates mock implementation for NoteService that properly tracks state
 */
export function createMockNoteService(state: MockNoteServiceState) {
  return {
    getNotes: jest.fn().mockImplementation((_userId: string, _options?: {
      page?: number
      pageSize?: number
      tag?: string | null
      searchQuery?: string
    }) => {
      const activeNotes = state.notes.filter(note => !state.deletedIds.has(note.id))

      // Apply tag filter if provided
      let filteredNotes = activeNotes
      if (_options?.tag) {
        filteredNotes = activeNotes.filter(note => note.tags?.includes(_options.tag!))
      }

      // Apply search filter if provided
      if (_options?.searchQuery) {
        const query = _options.searchQuery.toLowerCase()
        filteredNotes = filteredNotes.filter(note =>
          note.title.toLowerCase().includes(query) ||
          note.description?.toLowerCase().includes(query)
        )
      }

      return Promise.resolve({
        notes: filteredNotes,
        hasMore: false,
        totalCount: filteredNotes.length,
      })
    }),

    getNote: jest.fn().mockImplementation((id: string) => {
      if (state.deletedIds.has(id)) {
        return Promise.reject(new Error('Note not found'))
      }
      const note = state.notes.find(n => n.id === id)
      if (!note) {
        return Promise.reject(new Error('Note not found'))
      }
      return Promise.resolve(note)
    }),

    deleteNote: jest.fn().mockImplementation((id: string) => {
      state.deletedIds.add(id)
      return Promise.resolve(id)
    }),

    createNote: jest.fn().mockImplementation((note: Partial<Note>) => {
      const newNote = createMockNote(note)
      state.notes.push(newNote)
      state.createdNotes.push(newNote)
      return Promise.resolve(newNote)
    }),

    updateNote: jest.fn().mockImplementation((id: string, updates: Partial<Note>) => {
      state.updatedNotes.set(id, updates)
      const noteIndex = state.notes.findIndex(n => n.id === id)
      if (noteIndex >= 0) {
        state.notes[noteIndex] = { ...state.notes[noteIndex], ...updates }
      }
      return Promise.resolve({ id, ...updates })
    }),
  }
}

/**
 * Creates mock for database service
 */
export function createMockDatabaseService() {
  return {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    searchNotes: jest.fn().mockResolvedValue([]),
  }
}

/**
 * Creates mock for network status provider
 */
export function createMockNetworkStatus(isOnline: boolean = true) {
  return {
    isOnline: jest.fn().mockReturnValue(isOnline),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
  }
}

/**
 * Creates mock for sync service
 */
export function createMockSyncService() {
  const enqueue = jest.fn().mockResolvedValue(undefined)
  return {
    getManager: jest.fn().mockReturnValue({ enqueue }),
    enqueue,
  }
}

/**
 * Creates mock for useSupabase hook
 */
export function createMockSupabase(userId: string = 'test-user-id') {
  return {
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      rpc: jest.fn(() => Promise.resolve({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })),
    },
    user: userId ? { id: userId } : null,
  }
}

/**
 * Creates mock for useTheme hook
 */
export function createMockTheme() {
  return {
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      accent: '#f2f2f2',
      primary: '#00aa00',
      primaryForeground: '#ffffff',
      secondary: '#f7f7f7',
      mutedForeground: '#666666',
      secondaryForeground: '#222222',
      destructive: '#ff0000',
      destructiveForeground: '#ffffff',
    },
  }
}

/**
 * Default test user ID used across tests
 */
export const TEST_USER_ID = 'test-user-id'

/**
 * Helper to wait for async operations to complete
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}
