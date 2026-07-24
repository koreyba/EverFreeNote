import { createClient } from '@supabase/supabase-js'
import { supabaseClientFactory } from '../../adapters/supabaseClient'
import type { SupabaseClientFactoryDeps } from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

describe('supabaseClientFactory', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
  const mockConfig: SupabaseConfig = {
    url: 'https://xyz.supabase.co',
    anonKey: 'test-anon-key',
  }
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls createClient with correct url, anonKey, and auth options using custom storage and fetch', () => {
    const mockFetch = jest.fn() as unknown as typeof fetch
    const mockClientInstance = { auth: {} }
    mockCreateClient.mockReturnValue(mockClientInstance as unknown as ReturnType<typeof createClient>)

    const deps: SupabaseClientFactoryDeps = {
      storage: mockStorage,
      fetch: mockFetch,
    }

    const result = supabaseClientFactory.createClient(mockConfig, deps)

    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://xyz.supabase.co',
      'test-anon-key',
      {
        auth: {
          storage: mockStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        global: {
          fetch: mockFetch,
        },
      }
    )
    expect(result).toBe(mockClientInstance)
  })

  it('falls back to global fetch when deps.fetch is undefined', () => {
    const mockClientInstance = { auth: {} }
    mockCreateClient.mockReturnValue(mockClientInstance as unknown as ReturnType<typeof createClient>)

    const deps: SupabaseClientFactoryDeps = {
      storage: mockStorage,
    }

    supabaseClientFactory.createClient(mockConfig, deps)

    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://xyz.supabase.co',
      'test-anon-key',
      {
        auth: {
          storage: mockStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        global: {
          fetch: globalThis.fetch,
        },
      }
    )
  })
})
