import {
  clearSettingsReturnState,
  consumeSettingsReturnState,
  readSettingsReturnState,
  saveSettingsReturnState,
} from '@ui/web/lib/settingsNavigationState'

describe('settingsNavigationState', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('saves and reads a sanitized settings return state', () => {
    const saved = saveSettingsReturnState({
      returnPath: '/settings?tab=import#dialog',
      notesUiState: {
        selectedNoteId: null,
        selectedNote: null,
        isEditing: true,
        isSearchPanelOpen: false,
        searchQuery: 'draft',
        filterByTag: null,
      },
    })

    expect(saved).toBe(true)
    expect(readSettingsReturnState()).toEqual({
      returnPath: '/settings?tab=import#dialog',
      notesUiState: {
        selectedNoteId: null,
        selectedNote: null,
        isEditing: true,
        isSearchPanelOpen: false,
        searchQuery: 'draft',
        filterByTag: null,
      },
    })
  })

  it('clears stored settings return state explicitly', () => {
    saveSettingsReturnState({
      returnPath: '/',
      notesUiState: {
        selectedNoteId: 'note-1',
        selectedNote: {
          id: 'note-1',
          title: 'Title',
          description: 'Description',
          tags: ['tag-a'],
          created_at: '2026-03-15T10:00:00.000Z',
          updated_at: '2026-03-15T10:05:00.000Z',
          user_id: 'user-1',
          content: null,
          headline: null,
          rank: null,
        },
        isEditing: false,
        isSearchPanelOpen: true,
        searchQuery: 'term',
        filterByTag: 'tag-a',
      },
    })

    clearSettingsReturnState()

    expect(readSettingsReturnState()).toBeNull()
  })

  it('drops malformed stored payloads instead of returning them', () => {
    window.sessionStorage.setItem(
      'everfreenote:settings-return-state',
      JSON.stringify({
        returnPath: 'https://evil.example/redirect',
        notesUiState: {
          selectedNoteId: 'note-1',
          selectedNote: null,
          isEditing: true,
          isSearchPanelOpen: false,
          searchQuery: 'term',
          filterByTag: null,
        },
      }),
    )

    expect(readSettingsReturnState()).toBeNull()
    expect(window.sessionStorage.getItem('everfreenote:settings-return-state')).toBeNull()
  })

  it('consumes state and removes it from storage', () => {
    saveSettingsReturnState({
      returnPath: '/?from=settings',
      notesUiState: {
        selectedNoteId: 'note-2',
        selectedNote: {
          id: 'note-2',
          title: 'Focus note',
          description: 'Body',
          tags: ['focus'],
          created_at: '2026-03-15T09:00:00.000Z',
          updated_at: '2026-03-15T09:10:00.000Z',
          user_id: 'user-2',
          content: '<p>Body</p>',
          headline: 'Focus',
          rank: 0.8,
        },
        isEditing: false,
        isSearchPanelOpen: true,
        searchQuery: '',
        filterByTag: 'focus',
      },
    })

    expect(consumeSettingsReturnState()).toEqual({
      returnPath: '/?from=settings',
      notesUiState: {
        selectedNoteId: 'note-2',
        selectedNote: {
          id: 'note-2',
          title: 'Focus note',
          description: 'Body',
          tags: ['focus'],
          created_at: '2026-03-15T09:00:00.000Z',
          updated_at: '2026-03-15T09:10:00.000Z',
          user_id: 'user-2',
          content: '<p>Body</p>',
          headline: 'Focus',
          rank: 0.8,
        },
        isEditing: false,
        isSearchPanelOpen: true,
        searchQuery: '',
        filterByTag: 'focus',
      },
    })
    expect(readSettingsReturnState()).toBeNull()
  })

  it('gracefully handles blocked sessionStorage access', () => {
    const hadOwnDescriptor = Object.prototype.hasOwnProperty.call(window, 'sessionStorage')
    const originalOwnDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    })

    try {
      expect(() =>
        saveSettingsReturnState({
          returnPath: '/',
          notesUiState: {
            selectedNoteId: null,
            selectedNote: null,
            isEditing: false,
            isSearchPanelOpen: false,
            searchQuery: '',
            filterByTag: null,
          },
        }),
      ).not.toThrow()
      expect(readSettingsReturnState()).toBeNull()
      expect(() => clearSettingsReturnState()).not.toThrow()
      expect(consumeSettingsReturnState()).toBeNull()
    } finally {
      if (hadOwnDescriptor && originalOwnDescriptor) {
        Object.defineProperty(window, 'sessionStorage', originalOwnDescriptor)
      } else {
        Reflect.deleteProperty(window as unknown as { sessionStorage?: Storage }, 'sessionStorage')
      }
    }
  })

  it('rejects malformed selected note snapshots', () => {
    window.sessionStorage.setItem(
      'everfreenote:settings-return-state',
      JSON.stringify({
        returnPath: '/',
        notesUiState: {
          selectedNoteId: 'note-3',
          selectedNote: {
            id: 'note-3',
            title: 'Broken',
            description: 'Body',
            tags: 'not-an-array',
            created_at: '2026-03-15T09:00:00.000Z',
            updated_at: '2026-03-15T09:10:00.000Z',
            user_id: 'user-3',
          },
          isEditing: true,
          isSearchPanelOpen: false,
          searchQuery: '',
          filterByTag: null,
        },
      }),
    )

    expect(readSettingsReturnState()).toBeNull()
    expect(window.sessionStorage.getItem('everfreenote:settings-return-state')).toBeNull()
  })
})
