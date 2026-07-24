import React from 'react'
import { render, screen, act } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Session, User } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Mocks – must be hoisted before any imports of the modules under test
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn()
const mockSignOut = jest.fn()
const mockOnAuthStateChange = jest.fn()
const mockDeleteAccount = jest.fn()

const mockClient = {
  auth: {
    getSession: mockGetSession,
    signOut: mockSignOut,
    onAuthStateChange: mockOnAuthStateChange,
  },
}

jest.mock('@ui/mobile/adapters', () => ({
  getSupabaseConfig: jest.fn(() => ({ url: 'https://test.supabase.co', anonKey: 'test-anon-key' })),
  supabaseClientFactory: {
    createClient: jest.fn(() => mockClient),
  },
  secureStorageAdapter: {},
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    init: jest.fn(),
  },
}))

jest.mock('@core/services/auth', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    deleteAccount: mockDeleteAccount,
  })),
}))

// ---------------------------------------------------------------------------
// Import modules under test AFTER mocks are set up
// ---------------------------------------------------------------------------
import { SupabaseProvider, useSupabase, useAuth } from '../../providers/SupabaseProvider'
import { mobileSyncService } from '@ui/mobile/services/sync'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSubscription = { unsubscribe: jest.fn() }

function makeSession(userId = 'user-1'): Session {
  return {
    user: { id: userId, email: 'user@example.com' } as User,
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
  } as Session
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SupabaseProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscription.unsubscribe.mockClear()
    // Default: onAuthStateChange returns a subscription but does NOT fire any event
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
  })

  it('renders children', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    await act(async () => {
      render(
        <SupabaseProvider>
          <Text testID="child">Hello</Text>
        </SupabaseProvider>
      )
    })

    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('starts with loading=true, then sets loading=false after getSession resolves', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedLoading: boolean | undefined

    const ConsumerLoading = () => {
      const { loading } = useSupabase()
      capturedLoading = loading
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <ConsumerLoading />
        </SupabaseProvider>
      )
    })

    expect(capturedLoading).toBe(false)
  })

  it('sets user and session when getSession returns a session', async () => {
    const session = makeSession()
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    let capturedUser: User | null = null
    let capturedSession: Session | null = null

    const Consumer = () => {
      const ctx = useSupabase()
      capturedUser = ctx.user
      capturedSession = ctx.session
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(capturedUser).not.toBeNull()
    expect((capturedUser as User).id).toBe('user-1')
    expect(capturedSession).not.toBeNull()
  })

  it('sets user=null and session=null when getSession returns null session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedUser: User | null | undefined
    let capturedSession: Session | null | undefined

    const Consumer = () => {
      const ctx = useSupabase()
      capturedUser = ctx.user
      capturedSession = ctx.session
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(capturedUser).toBeNull()
    expect(capturedSession).toBeNull()
  })

  it('handles getSession error gracefully – sets user/session to null and loading=false', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'))
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    let capturedUser: User | null | undefined
    let capturedSession: Session | null | undefined
    let capturedLoading: boolean | undefined

    const Consumer = () => {
      const ctx = useSupabase()
      capturedUser = ctx.user
      capturedSession = ctx.session
      capturedLoading = ctx.loading
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(capturedUser).toBeNull()
    expect(capturedSession).toBeNull()
    expect(capturedLoading).toBe(false)
    consoleSpy.mockRestore()
  })

  it('calls mobileSyncService.init when session is available', async () => {
    const session = makeSession()
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    await act(async () => {
      render(
        <SupabaseProvider>
          <Text>child</Text>
        </SupabaseProvider>
      )
    })

    expect(mobileSyncService.init).toHaveBeenCalledWith(mockClient)
  })

  it('does NOT call mobileSyncService.init when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    await act(async () => {
      render(
        <SupabaseProvider>
          <Text>child</Text>
        </SupabaseProvider>
      )
    })

    expect(mobileSyncService.init).not.toHaveBeenCalled()
  })

  it('calls mobileSyncService.init when onAuthStateChange fires with a session', async () => {
    // getSession resolves with null first
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const session = makeSession()
    let authCallback: ((event: string, session: Session | null) => void) | null = null

    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: Session | null) => void) => {
      authCallback = cb
      return { data: { subscription: mockSubscription } }
    })

    await act(async () => {
      render(
        <SupabaseProvider>
          <Text>child</Text>
        </SupabaseProvider>
      )
    })

    // Clear calls from initial getSession path (null session → no init)
    jest.clearAllMocks()

    // Simulate auth state change event
    await act(async () => {
      authCallback?.('SIGNED_IN', session)
    })

    expect(mobileSyncService.init).toHaveBeenCalledWith(mockClient)
  })

  it('unsubscribes from auth state change on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { unmount } = render(
      <SupabaseProvider>
        <Text>child</Text>
      </SupabaseProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    unmount()

    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// useSupabase hook
// ---------------------------------------------------------------------------

describe('useSupabase', () => {
  it('throws when used outside of SupabaseProvider', () => {
    // Suppress expected React error output
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const Thrower = () => {
      useSupabase()
      return null
    }

    expect(() => render(<Thrower />)).toThrow('useSupabase must be used within SupabaseProvider')

    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// useAuth hook
// ---------------------------------------------------------------------------

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
  })

  it('returns isAuthenticated=true when user is present', async () => {
    const session = makeSession()
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    let capturedIsAuthenticated: boolean | undefined

    const Consumer = () => {
      const { isAuthenticated } = useAuth()
      capturedIsAuthenticated = isAuthenticated
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(capturedIsAuthenticated).toBe(true)
  })

  it('returns isAuthenticated=false when user is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedIsAuthenticated: boolean | undefined

    const Consumer = () => {
      const { isAuthenticated } = useAuth()
      capturedIsAuthenticated = isAuthenticated
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(capturedIsAuthenticated).toBe(false)
  })

  it('exposes signOut and deleteAccount functions', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    let capturedSignOut: (() => Promise<void>) | undefined
    let capturedDeleteAccount: (() => Promise<void>) | undefined

    const Consumer = () => {
      const { signOut, deleteAccount } = useAuth()
      capturedSignOut = signOut
      capturedDeleteAccount = deleteAccount
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    expect(typeof capturedSignOut).toBe('function')
    expect(typeof capturedDeleteAccount).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('calls client.auth.signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    let capturedSignOut: (() => Promise<void>) | undefined

    const Consumer = () => {
      const { signOut } = useSupabase()
      capturedSignOut = signOut
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    await act(async () => {
      await capturedSignOut?.()
    })

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('calls AuthService.deleteAccount and then signOut', async () => {
    mockDeleteAccount.mockResolvedValue(undefined)
    mockSignOut.mockResolvedValue({ error: null })

    let capturedDeleteAccount: (() => Promise<void>) | undefined

    const Consumer = () => {
      const { deleteAccount } = useSupabase()
      capturedDeleteAccount = deleteAccount
      return null
    }

    await act(async () => {
      render(
        <SupabaseProvider>
          <Consumer />
        </SupabaseProvider>
      )
    })

    await act(async () => {
      await capturedDeleteAccount?.()
    })

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1)
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })
})
