import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import React from 'react'
import { toast } from 'sonner'
import { webStorageAdapter } from '@ui/web/adapters/storage'

import { useNoteAuth, type NoteAuthConfig } from '@ui/web/hooks/useNoteAuth'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

const mockAuthService = {
  signInWithGoogle: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  deleteAccount: jest.fn(),
}
const mockSubscription = { unsubscribe: jest.fn() }
const mockOnAuthStateChange = jest.fn()
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: mockOnAuthStateChange,
  },
}

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(),
}))
jest.mock('@core/services/auth', () => ({
  AuthService: jest.fn().mockImplementation(() => mockAuthService),
}))
jest.mock('@ui/web/adapters/storage', () => ({
  webStorageAdapter: { removeItem: jest.fn().mockResolvedValue(undefined) },
}))
jest.mock('@ui/web/config', () => ({ webOAuthRedirectUri: 'https://app.example/auth/callback' }))
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

const config = (overrides: Partial<NoteAuthConfig> = {}): NoteAuthConfig => ({
  testAuthEnabled: true,
  testAuthEmail: 'test@example.com',
  testAuthPassword: 'test-password',
  skipAuthEmail: 'skip@example.com',
  skipAuthPassword: 'skip-password',
  ...overrides,
})

const user = { id: 'user-1', email: 'user@example.com' } as User

function renderAuthHook(authConfig = config()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(() => useNoteAuth(authConfig), { wrapper }) }
}

describe('useNoteAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(webStorageAdapter.removeItem).mockResolvedValue(undefined)
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
    mockAuthService.signInWithGoogle.mockResolvedValue({ error: null })
    mockAuthService.signInWithPassword.mockResolvedValue({ data: { user }, error: null })
    mockAuthService.signOut.mockResolvedValue({ error: null })
    mockAuthService.deleteAccount.mockResolvedValue({ deleted: true })
    jest.mocked(useSupabase).mockReturnValue({ supabase: mockSupabase as never, user: null, loading: false })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads the current session, tracks auth changes, and unsubscribes on cleanup', async () => {
    const { result, unmount } = renderAuthHook()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(webStorageAdapter.removeItem).toHaveBeenCalledWith('testUser')
    expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1)
    expect(result.current.user).toBeNull()

    const callback = mockOnAuthStateChange.mock.calls[0][0] as (_event: string, session: { user: User } | null) => void
    await act(async () => { await callback('SIGNED_IN', { user }) })
    expect(result.current.user).toBe(user)

    unmount()
    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('handles Google sign-in success and rejected service calls', async () => {
    const { result } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.handleSignInWithGoogle())
    expect(mockAuthService.signInWithGoogle).toHaveBeenCalledWith('https://app.example/auth/callback')

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockAuthService.signInWithGoogle.mockRejectedValueOnce(new Error('oauth unavailable'))
    await act(async () => result.current.handleSignInWithGoogle())
    expect(consoleError).toHaveBeenCalledWith('Error signing in:', expect.any(Error))
    consoleError.mockRestore()
  })

  it.each([
    ['test', 'handleTestLogin', 'testAuthEmail', 'testAuthPassword'],
    ['skip', 'handleSkipAuth', 'skipAuthEmail', 'skipAuthPassword'],
  ] as const)('rejects %s login when the feature is disabled or credentials are missing', async (_name, handler, emailKey, passwordKey) => {
    const disabled = renderAuthHook(config({ testAuthEnabled: false }))
    await waitFor(() => expect(disabled.result.current.loading).toBe(false))
    await act(async () => disabled.result.current[handler]())
    expect(toast.error).toHaveBeenCalledWith('Test authentication is disabled in this environment')

    const missing = renderAuthHook(config({ [emailKey]: '', [passwordKey]: '' }))
    await waitFor(() => expect(missing.result.current.loading).toBe(false))
    await act(async () => missing.result.current[handler]())
    expect(toast.error).toHaveBeenCalledWith(
      handler === 'handleTestLogin' ? 'Test auth credentials are not configured' : 'Skip-auth credentials are not configured',
    )
  })

  it.each([
    ['test', 'handleTestLogin', 'test@example.com', 'test-password', 'Failed to login as test user: invalid credentials', 'Logged in as test user!'],
    ['skip', 'handleSkipAuth', 'skip@example.com', 'skip-password', 'Failed to login as skip-auth user: invalid credentials', 'Logged in as skip-auth user!'],
  ] as const)('runs %s login through the service and resets loading on errors', async (_name, handler, email, password, errorMessage, successMessage) => {
    const { result } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockAuthService.signInWithPassword.mockResolvedValueOnce({ data: null, error: new Error('invalid credentials') })
    await act(async () => result.current[handler]())
    expect(mockAuthService.signInWithPassword).toHaveBeenCalledWith(email, password)
    expect(toast.error).toHaveBeenCalledWith(errorMessage)
    expect(result.current.authLoading).toBe(false)

    await act(async () => result.current[handler]())
    expect(result.current.user).toBe(user)
    expect(toast.success).toHaveBeenCalledWith(successMessage)

    mockAuthService.signInWithPassword.mockRejectedValueOnce(new Error('transport'))
    await act(async () => result.current[handler]())
    expect(toast.error).toHaveBeenCalledWith(handler === 'handleTestLogin' ? 'Failed to login as test user' : 'Failed to login as skip-auth user')
    expect(result.current.authLoading).toBe(false)
  })

  it('signs out, clears notes, and invokes the callback', async () => {
    const { result, queryClient } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    const removeQueries = jest.spyOn(queryClient, 'removeQueries')
    const callback = jest.fn()

    await act(async () => result.current.handleSignOut(callback))

    expect(mockAuthService.signOut).toHaveBeenCalled()
    expect(webStorageAdapter.removeItem).toHaveBeenCalledWith('testUser')
    expect(result.current.user).toBeNull()
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['notes'] })
    expect(callback).toHaveBeenCalled()
  })

  it('reports sign-out and account deletion failures without leaving loading flags set', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    mockAuthService.signOut.mockRejectedValueOnce(new Error('sign-out failed'))
    await act(async () => result.current.handleSignOut())
    expect(consoleError).toHaveBeenCalledWith('Error signing out:', expect.any(Error))

    await act(async () => {
      const callback = mockOnAuthStateChange.mock.calls[0][0] as (_event: string, session: { user: User } | null) => void
      await callback('SIGNED_IN', { user })
    })
    mockAuthService.deleteAccount.mockRejectedValueOnce(new Error('delete failed'))
    await act(async () => result.current.handleDeleteAccount())
    expect(toast.error).toHaveBeenCalledWith('delete failed')
    expect(result.current.deleteAccountLoading).toBe(false)
    consoleError.mockRestore()
  })

  it('does not delete an account when no user is signed in', async () => {
    const { result } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => result.current.handleDeleteAccount())

    expect(mockAuthService.deleteAccount).not.toHaveBeenCalled()
  })

  it('deletes the account, signs out, and calls the supplied callback', async () => {
    const { result } = renderAuthHook()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      const callback = mockOnAuthStateChange.mock.calls[0][0] as (_event: string, session: { user: User } | null) => void
      await callback('SIGNED_IN', { user })
    })
    const callback = jest.fn()

    await act(async () => result.current.handleDeleteAccount(callback))

    expect(mockAuthService.deleteAccount).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Account deleted')
    expect(mockAuthService.signOut).toHaveBeenCalled()
    expect(callback).toHaveBeenCalled()
    expect(result.current.deleteAccountLoading).toBe(false)
  })
})
