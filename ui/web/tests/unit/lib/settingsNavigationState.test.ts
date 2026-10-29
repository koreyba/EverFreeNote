import {
  clearSettingsReturnState,
  consumeSettingsReturnState,
  readSettingsReturnState,
  saveSettingsReturnState,
} from '@ui/web/lib/settingsNavigationState'
import { applyNoteOverlay } from '@core/utils/overlay'

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
    }, 'user-1')

    expect(saved).toBe(true)
    expect(readSettingsReturnState('user-1')).toEqual({
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

  it('never restores one account’s settings snapshot to another account', () => {
    saveSettingsReturnState({
      returnPath: '/',
      notesUiState: { selectedNoteId: null, selectedNote: null, isEditing: false, isSearchPanelOpen: true, searchQuery: 'private search', filterByTag: null },
    }, 'account-a')
    expect(readSettingsReturnState('account-b')).toBeNull()
    expect(consumeSettingsReturnState('account-b')).toBeNull()
  })

  it('rejects legacy unowned and mismatched selected-note snapshots', () => {
    const notesUiState = {
      selectedNoteId: 'note-a',
      selectedNote: { id: 'note-a', title: 'Private', description: 'Body', tags: [], created_at: '2026-01-01', updated_at: '2026-01-01', user_id: 'account-a' },
      isEditing: false, isSearchPanelOpen: false, searchQuery: '', filterByTag: null,
    }
    expect(saveSettingsReturnState({ returnPath: '/', notesUiState }, 'account-b')).toBe(false)
    window.sessionStorage.setItem('everfreenote:settings-return-state', JSON.stringify({ returnPath: '/', notesUiState }))
    expect(readSettingsReturnState('account-a')).toBeNull()
  })

  it('retains a local-only note when returning from Settings for its owner', () => {
    const [selectedNote] = applyNoteOverlay([], [{
      id: 'local-only', user_id: 'account-a', title: 'Offline draft',
      description: 'Draft body', tags: [], status: 'pending', updatedAt: '2026-01-01T00:00:00.000Z',
    }])
    const notesUiState = {
      selectedNoteId: selectedNote.id, selectedNote,
      isEditing: false, isSearchPanelOpen: false, searchQuery: '', filterByTag: null,
    }
    expect(saveSettingsReturnState({ returnPath: '/', notesUiState }, 'account-a')).toBe(true)
    expect(readSettingsReturnState('account-a')?.notesUiState.selectedNote?.user_id).toBe('account-a')
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
    }, 'user-1')

    clearSettingsReturnState()

    expect(readSettingsReturnState('user-1')).toBeNull()
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

    expect(readSettingsReturnState('user-1')).toBeNull()
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
    }, 'user-2')

    expect(consumeSettingsReturnState('user-2')).toEqual({
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
    expect(readSettingsReturnState('user-2')).toBeNull()
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
        }, 'user-1'),
      ).not.toThrow()
      expect(readSettingsReturnState('user-1')).toBeNull()
      expect(() => clearSettingsReturnState()).not.toThrow()
      expect(consumeSettingsReturnState('user-1')).toBeNull()
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

    expect(readSettingsReturnState('user-1')).toBeNull()
    expect(window.sessionStorage.getItem('everfreenote:settings-return-state')).toBeNull()
  })
})
