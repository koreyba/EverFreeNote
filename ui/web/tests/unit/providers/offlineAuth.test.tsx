import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { AccountSessionBoundary, SupabaseProvider, useSupabase } from '@ui/web/providers/SupabaseProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { useNoteAuth } from '@ui/web/hooks/useNoteAuth'
import { buildBrowserSupabaseStorageKey, webSupabaseClientFactory } from '@ui/web/adapters/supabaseClient'

const url = 'https://offline-auth.supabase.co'
const user = { id: 'offline-user', email: 'offline@example.invalid' }
const key = buildBrowserSupabaseStorageKey(url)
const getSession = jest.fn()
const onAuthStateChange = jest.fn()

jest.mock('@ui/web/config', () => ({ supabaseConfig: { url: 'https://offline-auth.supabase.co', anonKey: 'public-key' } }))
jest.mock('@ui/web/adapters/supabaseClient', () => ({
  ...jest.requireActual('@ui/web/adapters/supabaseClient'),
  webSupabaseClientFactory: { createClient: jest.fn() },
}))

function session(issuer = `${url}/auth/v1`) {
  return {
    user,
    access_token: `header.${Buffer.from(JSON.stringify({ iss: issuer, sub: user.id })).toString('base64url')}.signature`,
    refresh_token: 'stored-refresh-token',
    expires_at: 1,
  }
}

function clearCookies() {
  document.cookie.split(';').forEach((cookie) => {
    document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; Path=/`
  })
}

function storeSession(value: unknown, chunked = false) {
  const encoded = `base64-${Buffer.from(JSON.stringify(value)).toString('base64url')}`
  if (chunked) {
    const middle = Math.floor(encoded.length / 2)
    document.cookie = `${key}.0=${encoded.slice(0, middle)}; Path=/`
    document.cookie = `${key}.1=${encoded.slice(middle)}; Path=/`
  } else document.cookie = `${key}=${encoded}; Path=/`
}

function Consumer() {
  const auth = useNoteAuth()
  return <output>{auth.loading ? 'loading' : auth.user?.id ?? 'signed-out'}</output>
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><SupabaseProvider><Consumer /></SupabaseProvider></QueryClientProvider>)
}

beforeEach(() => {
  clearCookies()
  getSession.mockReset().mockReturnValue(new Promise(() => undefined))
  onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
  jest.mocked(webSupabaseClientFactory.createClient).mockReturnValue({ auth: { getSession, onAuthStateChange, signOut: jest.fn() } } as never)
})

afterEach(clearCookies)

it.each([false, true])('opens an expired saved session while refresh is unreachable (chunked=%s)', async (chunked) => {
  storeSession(session(), chunked)
  mount()
  await waitFor(() => expect(screen.getByText(user.id)).toBeTruthy())
  expect(getSession).toHaveBeenCalledTimes(1)
})

it('shows sign-in instead of an endless spinner when no local session exists', async () => {
  mount()
  await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy())
})

it('never opens a session saved for a different backend', async () => {
  storeSession(session('https://different-project.supabase.co/auth/v1'))
  mount()
  await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy())
})

it('keeps local access when refresh returns a transport error and an empty initial event', async () => {
  storeSession(session())
  getSession.mockResolvedValue({ data: { session: null }, error: new Error('Network unavailable') })
  mount()
  await waitFor(() => expect(screen.getByText(user.id)).toBeTruthy())
  act(() => onAuthStateChange.mock.calls[0][0]('INITIAL_SESSION', null))
  expect(screen.getByText(user.id)).toBeTruthy()
})

it('clears local access on sign-out and ignores an older session request finishing later', async () => {
  let finish!: (value: unknown) => void
  getSession.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  storeSession(session())
  mount()
  await waitFor(() => expect(screen.getByText(user.id)).toBeTruthy())
  clearCookies()
  act(() => onAuthStateChange.mock.calls[0][0]('SIGNED_OUT', null))
  await act(async () => finish({ data: { session: session() }, error: null }))
  expect(screen.getByText('signed-out')).toBeTruthy()
})

it('keeps state on token refresh but replaces it for a new auth epoch, even for the same account', async () => {
  let instances = 0
  const clients: QueryClient[] = []
  function Probe() {
    const { user: current } = useSupabase()
    const client = useQueryClient()
    if (!clients.includes(client)) clients.push(client)
    const [instance] = React.useState(() => ++instances)
    return <output data-testid="account-boundary">{instance}:{current?.id ?? 'signed-out'}:{client.getQueryData(['probe']) ?? 'empty'}</output>
  }
  render(<SupabaseProvider><AccountSessionBoundary><QueryProvider><Probe /></QueryProvider></AccountSessionBoundary></SupabaseProvider>)
  await waitFor(() => expect(screen.getByTestId('account-boundary').textContent).toContain('signed-out'))
  act(() => onAuthStateChange.mock.calls[0][0]('SIGNED_IN', session()))
  const first = screen.getByTestId('account-boundary').textContent
  expect(first).toContain(user.id)
  const firstClient = clients.at(-1)!
  firstClient.setQueryData(['probe'], 'old-account-data')
  act(() => onAuthStateChange.mock.calls[0][0]('TOKEN_REFRESHED', session()))
  expect(clients.at(-1)).toBe(firstClient)
  expect(firstClient.getQueryData(['probe'])).toBe('old-account-data')
  act(() => {
    onAuthStateChange.mock.calls[0][0]('SIGNED_OUT', null)
    onAuthStateChange.mock.calls[0][0]('SIGNED_IN', session())
  })
  expect(screen.getByTestId('account-boundary').textContent).toContain(user.id)
  expect(screen.getByTestId('account-boundary').textContent).not.toBe(first)
  expect(clients.at(-1)).not.toBe(firstClient)
  expect(clients.at(-1)!.getQueryData(['probe'])).toBeUndefined()
})
