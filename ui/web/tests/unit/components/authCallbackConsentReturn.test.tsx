import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'

import { webSupabaseClientFactory } from '@ui/web/adapters/supabaseClient'
import AuthCallback from '@/app/auth/callback/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@ui/web/adapters/supabaseClient', () => ({
  webSupabaseClientFactory: {
    createClient: jest.fn(),
  },
}))

jest.mock('@ui/web/adapters/storage', () => ({
  webStorageAdapter: {},
}))

jest.mock('@ui/web/config', () => ({
  supabaseConfig: {
    url: 'https://testproject.supabase.co',
    anonKey: 'test-key',
  },
}))

const STORAGE_KEY = 'everfreenote:oauth-consent-authorization-id'

describe('AuthCallback — return to pending OAuth consent', () => {
  const mockPush = jest.fn()
  const mockGetSession = jest.fn()
  const mockExchangeCodeForSession = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(webSupabaseClientFactory.createClient as jest.Mock).mockReturnValue({
      auth: { getSession: mockGetSession, exchangeCodeForSession: mockExchangeCodeForSession },
    })
    window.sessionStorage.clear()
    localStorage.clear()
    window.history.pushState({}, '', '/auth/callback')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns to the consent page when an authorization is pending and a session exists', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'auth-42')
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } })

    render(<AuthCallback />)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/oauth/consent?authorization_id=auth-42'))
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns to the consent page after exchanging the code', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'auth-7')
    window.history.pushState({}, '', '/auth/callback?code=abc')
    localStorage.setItem('sb-testproject-auth-code-verifier', 'verifier')
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co'
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    mockExchangeCodeForSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } }, error: null })

    render(<AuthCallback />)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/oauth/consent?authorization_id=auth-7'))
  })

  it('falls back to the home page when nothing is pending', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } })

    render(<AuthCallback />)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
  })

  it('does not consume the pending id on failure paths', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'auth-9')
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })

    render(<AuthCallback />)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/?error=auth_callback_failed')))
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('auth-9')
  })
})
