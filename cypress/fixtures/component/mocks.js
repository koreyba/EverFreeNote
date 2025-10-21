/**
 * Mock configurations for component tests
 * This file exports ready-to-use mock configurations for different scenarios
 */

export const mockConfigs = {
  // Auth mocks
  auth: {
    authenticated: {
      supabase: {
        auth: {
          getUser: { data: { user: require('./users.json').authenticatedUser } },
          signOut: { data: {} }
        }
      }
    },
    unauthenticated: {
      supabase: {
        auth: {
          getUser: { data: { user: null } }
        }
      }
    },
    loginSuccess: {
      supabase: {
        auth: {
          signInWithPassword: require('./api-responses.json').auth.loginSuccess
        }
      }
    },
    loginError: {
      supabase: {
        auth: {
          signInWithPassword: { error: require('./api-responses.json').auth.loginError }
        }
      }
    }
  },

  // Notes mocks
  notes: {
    getNotesSuccess: {
      supabase: {
        from: {
          select: require('./api-responses.json').notes.getNotesSuccess
        }
      }
    },
    getNotesError: {
      supabase: {
        from: {
          select: { error: require('./api-responses.json').notes.notesError }
        }
      }
    },
    createNoteSuccess: {
      supabase: {
        from: {
          insert: require('./api-responses.json').notes.createNoteSuccess
        }
      }
    },
    updateNoteSuccess: {
      supabase: {
        from: {
          update: require('./api-responses.json').notes.updateNoteSuccess
        }
      }
    },
    deleteNoteSuccess: {
      supabase: {
        from: {
          delete: require('./api-responses.json').notes.deleteNoteSuccess
        }
      }
    }
  },

  // Search mocks
  search: {
    searchSuccess: {
      searchNotes: require('./api-responses.json').search.searchSuccess
    },
    searchEmpty: {
      searchNotes: require('./api-responses.json').search.searchEmpty
    },
    searchError: {
      searchNotes: { error: require('./api-responses.json').search.searchError }
    }
  },

  // UI state mocks
  ui: {
    loading: require('./ui-states.json').loadingState,
    error: require('./ui-states.json').errorState,
    success: require('./ui-states.json').successState,
    idle: require('./ui-states.json').idleState
  }
}

// Helper functions to easily apply mocks in tests
export const applyMocks = (cy, ...mockNames) => {
  const combinedMocks = {}

  mockNames.forEach(name => {
    const [category, scenario] = name.split('.')
    if (mockConfigs[category] && mockConfigs[category][scenario]) {
      Object.assign(combinedMocks, mockConfigs[category][scenario])
    }
  })

  cy.setupMocks(combinedMocks)
}

// Quick preset combinations
export const mockPresets = {
  // Common presets for different test scenarios
  authenticatedUser: ['auth.authenticated'],
  unauthenticatedUser: ['auth.unauthenticated'],
  notesList: ['auth.authenticated', 'notes.getNotesSuccess'],
  noteEditing: ['auth.authenticated', 'notes.updateNoteSuccess'],
  searchActive: ['auth.authenticated', 'search.searchSuccess'],
  errorState: ['auth.authenticated', 'notes.getNotesError'],

  // Apply preset by name
  apply: (cy, presetName) => {
    if (mockPresets[presetName]) {
      applyMocks(cy, ...mockPresets[presetName])
    }
  }
}
