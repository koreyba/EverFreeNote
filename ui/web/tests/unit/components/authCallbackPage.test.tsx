import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
    supabaseUrl: 'https://testproject.supabase.co',
    supabaseAnonKey: 'test-key',
  },
}))

describe('AuthCallback component', () => {
  const mockPush = jest.fn()
  const mockGetSession = jest.fn()
  const mockExchangeCodeForSession = jest.fn()

  const mockSupabaseClient = {
    auth: {
      getSession: mockGetSession,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }

  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})

    process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: 'https://testproject.supabase.co' }

    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })

    ;(webSupabaseClientFactory.createClient as jest.Mock).mockReturnValue(mockSupabaseClient)

    localStorage.clear()
    window.history.pushState({}, '', '/auth/callback')
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it('renders loading UI with spinner and text', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}))

    render(<AuthCallback />)

    expect(screen.getByText('Signing you in...')).toBeTruthy()
  })

  it('redirects to home if existing session is found', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1' } } },
    })

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('redirects with error if no authorization code is present in URL', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    })

    window.history.pushState({}, '', '/auth/callback')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/?error=auth_callback_failed&message=No%20authorization%20code%20provided'
      )
    })
  })

  it('redirects with error if code verifier is missing and postCheck has no session', async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } }) // initial check
      .mockResolvedValueOnce({ data: { session: null } }) // post check

    window.history.pushState({}, '', '/auth/callback?code=test-code')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/?error=auth_callback_failed&message=Auth%20session%20could%20not%20be%20restored'
      )
    })
  })

  it('redirects to home if code verifier is missing but postCheck restores session', async () => {
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } }) // initial check
      .mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } }) // post check

    window.history.pushState({}, '', '/auth/callback?code=test-code')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('successfully exchanges code for session and redirects to home', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })

    localStorage.setItem('sb-testproject-auth-code-verifier', 'mock-verifier')
    window.history.pushState({}, '', '/auth/callback?code=valid-code')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('handles exchange error and redirects with error message', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid code', status: 400, name: 'AuthApiError' },
    })

    localStorage.setItem('sb-testproject-auth-code-verifier', 'mock-verifier')
    window.history.pushState({}, '', '/auth/callback?code=bad-code')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/?error=auth_callback_failed&message=Invalid%20code'
      )
    })
  })

  it('handles empty session response after code exchange and redirects with error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    localStorage.setItem('sb-testproject-auth-code-verifier', 'mock-verifier')
    window.history.pushState({}, '', '/auth/callback?code=valid-code')

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/?error=auth_callback_failed&message=Failed%20to%20establish%20session'
      )
    })
  })

  it('handles unexpected thrown exceptions during callback handling', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('Unexpected network failure'))

    render(<AuthCallback />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/?error=auth_callback_failed&message=Unexpected%20network%20failure'
      )
    })
  })
})
