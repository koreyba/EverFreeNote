import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}))
jest.mock('@ui/web/hooks/useNoteAppController')
jest.mock('@ui/web/featureFlags', () => ({
  featureFlags: {
    testAuth: true,
  },
}))
jest.mock('@ui/web/lib/settingsNavigationState', () => ({
  consumeSettingsReturnState: jest.fn(),
}))
jest.mock('@ui/web/lib/aiIndexNavigationState', () => ({
  clearActiveSettingsNoteReturnPath: jest.fn(),
  consumeAIIndexPendingNoteState: jest.fn(),
  saveActiveSettingsNoteReturnPath: jest.fn(),
}))

import App from '@/app/page'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { consumeSettingsReturnState } from '@ui/web/lib/settingsNavigationState'
import {
  clearActiveSettingsNoteReturnPath,
  consumeAIIndexPendingNoteState,
  saveActiveSettingsNoteReturnPath,
} from '@ui/web/lib/aiIndexNavigationState'

interface MockAuthShellProps {
  enableTestAuth: boolean
  onTestLogin: () => void
  onSkipAuth: () => void
  onGoogleAuth: () => void
}

interface MockNotesShellProps {
  controller: ReturnType<typeof useNoteAppController>
}

jest.mock('@/components/features/auth/AuthShell', () => ({
  AuthShell: ({ enableTestAuth, onTestLogin, onSkipAuth, onGoogleAuth }: MockAuthShellProps) => (
    <div data-testid="auth-shell">
      <span>{enableTestAuth ? 'Test Auth Enabled' : 'Test Auth Disabled'}</span>
      <button type="button" onClick={onTestLogin}>Test Login</button>
      <button type="button" onClick={onSkipAuth}>Skip Auth</button>
      <button type="button" onClick={onGoogleAuth}>Google Auth</button>
    </div>
  ),
}))

jest.mock('@/components/features/notes/NotesShell', () => ({
  NotesShell: ({ controller }: MockNotesShellProps) => (
    <div data-testid="notes-shell">
      <span>Notes Shell Rendered</span>
      <span>User ID: {controller.user?.id}</span>
    </div>
  ),
}))

describe('App Component (app/page.tsx)', () => {
  const mockRestoreUiState = jest.fn().mockResolvedValue(undefined)
  const mockHandleTestLogin = jest.fn()
  const mockHandleSkipAuth = jest.fn()
  const mockHandleSignInWithGoogle = jest.fn()

  const createMockController = (overrides = {}) => ({
    user: null,
    loading: false,
    handleTestLogin: mockHandleTestLogin,
    handleSkipAuth: mockHandleSkipAuth,
    handleSignInWithGoogle: mockHandleSignInWithGoogle,
    restoreUiState: mockRestoreUiState,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    window.history.pushState({}, '', '/')
    jest.mocked(consumeSettingsReturnState).mockReturnValue(null)
    jest.mocked(consumeAIIndexPendingNoteState).mockReturnValue(null)
    jest.mocked(useNoteAppController).mockReturnValue(createMockController() as never)
  })

  it('renders loading spinner when controller loading is true', () => {
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: true }) as never
    )

    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Loading EverFreeNote' })).toBeTruthy()
    expect(screen.queryByTestId('auth-shell')).toBeNull()
    expect(screen.queryByTestId('notes-shell')).toBeNull()
  })

  it('renders AuthShell when loading is false and user is null', () => {
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: false, user: null }) as never
    )

    render(<App />)

    expect(screen.getByTestId('auth-shell')).toBeTruthy()
    expect(screen.getByText('Test Auth Enabled')).toBeTruthy()
    expect(screen.queryByTestId('notes-shell')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Test Login' }))
    expect(mockHandleTestLogin).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Skip Auth' }))
    expect(mockHandleSkipAuth).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Google Auth' }))
    expect(mockHandleSignInWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('renders NotesShell when loading is false and user is authenticated', () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' }
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: false, user: mockUser }) as never
    )

    render(<App />)

    expect(screen.getByTestId('notes-shell')).toBeTruthy()
    expect(screen.getByText('User ID: user-123')).toBeTruthy()
    expect(screen.queryByTestId('auth-shell')).toBeNull()
  })

  it('shows auth error toast and cleans URL when error search param is auth_callback_failed', () => {
    window.history.pushState({}, '', '/?error=auth_callback_failed&message=OAuth%20Error')
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState')

    render(<App />)

    expect(toast.error).toHaveBeenCalledWith('Authentication failed: OAuth Error')
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/')
  })

  it('shows default error message when auth_callback_failed has no message parameter', () => {
    window.history.pushState({}, '', '/?error=auth_callback_failed')

    render(<App />)

    expect(toast.error).toHaveBeenCalledWith('Authentication failed: Unknown error')
  })

  it('restores UI state when consumeSettingsReturnState returns return state', async () => {
    const mockUser = { id: 'user-123' }
    const returnState = {
      notesUiState: {
        selectedNoteId: 'note-456',
        selectedNote: null,
        isEditing: false,
        isSearchPanelOpen: false,
        searchQuery: '',
        filterByTag: null,
      },
    }

    jest.mocked(consumeSettingsReturnState).mockReturnValue(returnState as never)
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: false, user: mockUser }) as never
    )

    render(<App />)

    await waitFor(() => {
      expect(clearActiveSettingsNoteReturnPath).toHaveBeenCalledTimes(1)
      expect(mockRestoreUiState).toHaveBeenCalledWith(returnState.notesUiState)
    })
  })

  it('handles restoreUiState rejection when restoring settings return state', async () => {
    const mockUser = { id: 'user-123' }
    const failingRestoreUiState = jest.fn().mockRejectedValue(new Error('Failed restore'))
    const returnState = {
      notesUiState: {
        selectedNoteId: 'note-456',
        selectedNote: null,
        isEditing: false,
        isSearchPanelOpen: false,
        searchQuery: '',
        filterByTag: null,
      },
    }

    jest.mocked(consumeSettingsReturnState).mockReturnValue(returnState as never)
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: false, user: mockUser, restoreUiState: failingRestoreUiState }) as never
    )

    render(<App />)

    await waitFor(() => {
      expect(failingRestoreUiState).toHaveBeenCalledWith(returnState.notesUiState)
    })
  })

  it('restores UI state and saves active settings note return path when AI index pending state exists', async () => {
    const mockUser = { id: 'user-789' }
    const pendingNoteState = {
      returnPath: '/settings?tab=ai-index',
      noteId: 'note-ai-789',
    }

    jest.mocked(consumeAIIndexPendingNoteState).mockReturnValue(pendingNoteState as never)
    jest.mocked(useNoteAppController).mockReturnValue(
      createMockController({ loading: false, user: mockUser }) as never
    )

    render(<App />)

    await waitFor(() => {
      expect(saveActiveSettingsNoteReturnPath).toHaveBeenCalledWith('/settings?tab=ai-index')
      expect(mockRestoreUiState).toHaveBeenCalledWith({
        selectedNoteId: 'note-ai-789',
        selectedNote: null,
        isEditing: false,
        isSearchPanelOpen: false,
        searchQuery: '',
        filterByTag: null,
      })
    })
  })
})
