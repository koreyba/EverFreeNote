import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { OAuthConsentPageClient } from '@/components/features/oauth/OAuthConsentPageClient'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

let mockSearch = ''

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

const mockHandleSignInWithGoogle = jest.fn()
const mockHandleTestLogin = jest.fn()
const mockHandleSkipAuth = jest.fn()

jest.mock('@ui/web/hooks/useNoteAuth', () => ({
  useNoteAuth: () => ({
    handleSignInWithGoogle: mockHandleSignInWithGoogle,
    handleTestLogin: mockHandleTestLogin,
    handleSkipAuth: mockHandleSkipAuth,
  }),
}))

const STORAGE_KEY = 'everfreenote:oauth-consent-authorization-id'
const AUTHORIZATION_ID = 'auth-123'
const user = { id: 'user-1', email: 'me@example.com' } as User

const details = {
  authorization_id: AUTHORIZATION_ID,
  client: { id: 'client-1', name: 'Claude', uri: 'https://claude.ai/app', logo_uri: '' },
  user: { id: 'user-1', email: 'me@example.com' },
  scope: 'openid email',
}

function createSupabase() {
  const oauth = {
    getAuthorizationDetails: jest.fn(),
    approveAuthorization: jest.fn(),
    denyAuthorization: jest.fn(),
  }
  const supabase = { auth: { oauth } } as unknown as SupabaseClient
  return { supabase, oauth }
}

function renderPage(options: {
  supabase: SupabaseClient
  user?: User | null
  loading?: boolean
  navigate?: (url: string) => void
}) {
  return render(
    <SupabaseTestProvider supabase={options.supabase} user={options.user ?? null} loading={options.loading ?? false}>
      <OAuthConsentPageClient navigate={options.navigate ?? jest.fn()} />
    </SupabaseTestProvider>,
  )
}

describe('OAuthConsentPageClient', () => {
  beforeEach(() => {
    mockSearch = `authorization_id=${AUTHORIZATION_ID}`
    window.sessionStorage.clear()
    jest.clearAllMocks()
  })

  it('shows an error when the authorization id is missing or invalid', () => {
    mockSearch = ''
    const { supabase, oauth } = createSupabase()

    renderPage({ supabase, user })

    expect(screen.getByText('Invalid authorization request')).toBeTruthy()
    expect(oauth.getAuthorizationDetails).not.toHaveBeenCalled()

    mockSearch = 'authorization_id=bad%20id'
    renderPage({ supabase, user })
    expect(screen.getAllByText('Invalid authorization request').length).toBeGreaterThan(0)
  })

  it('shows a spinner while the session is loading', () => {
    const { supabase, oauth } = createSupabase()

    renderPage({ supabase, loading: true })

    expect(screen.getByText('Checking your session...')).toBeTruthy()
    expect(oauth.getAuthorizationDetails).not.toHaveBeenCalled()
  })

  it('asks the signed-out user to sign in and remembers the pending id for Google sign-in', async () => {
    const { supabase, oauth } = createSupabase()
    mockHandleSignInWithGoogle.mockResolvedValue(undefined)

    renderPage({ supabase, user: null })

    expect(screen.getByTestId('oauth-consent-signin')).toBeTruthy()
    expect(oauth.getAuthorizationDetails).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(mockHandleSignInWithGoogle).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(AUTHORIZATION_ID)
  })

  it('wires the test-auth buttons to the auth hook', async () => {
    const { supabase } = createSupabase()
    mockHandleTestLogin.mockResolvedValue(undefined)
    mockHandleSkipAuth.mockResolvedValue(undefined)

    renderPage({ supabase, user: null })

    fireEvent.click(screen.getByRole('button', { name: /test login/i }))
    await waitFor(() => expect(mockHandleTestLogin).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /skip authentication/i }))
    await waitFor(() => expect(mockHandleSkipAuth).toHaveBeenCalledTimes(1))
  })

  it('loads and renders the authorization details for a signed-in user', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })

    renderPage({ supabase, user })

    expect(screen.getByText('Loading authorization request...')).toBeTruthy()

    await waitFor(() => expect(screen.getByTestId('oauth-consent-card')).toBeTruthy())
    expect(oauth.getAuthorizationDetails).toHaveBeenCalledWith(AUTHORIZATION_ID)
    expect(screen.getByTestId('oauth-consent-client-name').textContent).toBe('Claude')
    expect(screen.getByText('claude.ai')).toBeTruthy()
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(screen.getByTestId('oauth-consent-scopes').textContent).toContain('openid')
    expect(screen.getByTestId('oauth-consent-scopes').textContent).toContain('email')
    expect(screen.getByText('Create new notes')).toBeTruthy()
  })

  it('falls back to generic labels when client data is sparse', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockResolvedValue({
      data: { ...details, client: { ...details.client, name: '  ', uri: 'not a url' }, scope: '' },
      error: null,
    })

    renderPage({ supabase, user })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-card')).toBeTruthy())
    expect(screen.getByTestId('oauth-consent-client-name').textContent).toBe('An application')
    expect(screen.queryByTestId('oauth-consent-scopes')).toBeNull()
  })

  it('redirects immediately when consent was already granted', async () => {
    const { supabase, oauth } = createSupabase()
    const navigate = jest.fn()
    window.sessionStorage.setItem(STORAGE_KEY, AUTHORIZATION_ID)
    oauth.getAuthorizationDetails.mockResolvedValue({
      data: { ...details, redirect_url: 'https://client.example/callback?code=1' },
      error: null,
    })

    renderPage({ supabase, user, navigate })

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://client.example/callback?code=1'))
    expect(screen.getByText('Returning to the application...')).toBeTruthy()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('shows an error when the authorization request cannot be loaded', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: null, error: { message: 'expired' } })

    renderPage({ supabase, user })

    await waitFor(() => expect(screen.getByText('Authorization failed')).toBeTruthy())
    expect(screen.getByText('expired')).toBeTruthy()
  })

  it('shows a fallback message when loading throws', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockRejectedValue(new Error('network'))

    renderPage({ supabase, user })

    await waitFor(() => expect(screen.getByText('network')).toBeTruthy())
  })

  it('approves and redirects back to the client', async () => {
    const { supabase, oauth } = createSupabase()
    const navigate = jest.fn()
    window.sessionStorage.setItem(STORAGE_KEY, AUTHORIZATION_ID)
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })
    oauth.approveAuthorization.mockResolvedValue({ data: { redirect_url: 'https://client.example/cb' }, error: null })

    renderPage({ supabase, user, navigate })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-approve')).toBeTruthy())
    fireEvent.click(screen.getByTestId('oauth-consent-approve'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://client.example/cb'))
    expect(oauth.approveAuthorization).toHaveBeenCalledWith(AUTHORIZATION_ID, { skipBrowserRedirect: true })
    expect(oauth.denyAuthorization).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(screen.getByText('Returning to the application...')).toBeTruthy()
  })

  it('denies and redirects back to the client', async () => {
    const { supabase, oauth } = createSupabase()
    const navigate = jest.fn()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })
    oauth.denyAuthorization.mockResolvedValue({ data: { redirect_url: 'https://client.example/denied' }, error: null })

    renderPage({ supabase, user, navigate })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-deny')).toBeTruthy())
    fireEvent.click(screen.getByTestId('oauth-consent-deny'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://client.example/denied'))
    expect(oauth.denyAuthorization).toHaveBeenCalledWith(AUTHORIZATION_ID, { skipBrowserRedirect: true })
    expect(oauth.approveAuthorization).not.toHaveBeenCalled()
  })

  it('disables both buttons while a decision is in flight', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })
    oauth.approveAuthorization.mockReturnValue(new Promise(() => {}))

    renderPage({ supabase, user })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-approve')).toBeTruthy())
    fireEvent.click(screen.getByTestId('oauth-consent-approve'))

    await waitFor(() => expect((screen.getByTestId('oauth-consent-approve') as HTMLButtonElement).disabled).toBe(true))
    expect((screen.getByTestId('oauth-consent-deny') as HTMLButtonElement).disabled).toBe(true)
  })

  it('surfaces approval errors and re-enables the buttons', async () => {
    const { supabase, oauth } = createSupabase()
    const navigate = jest.fn()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })
    oauth.approveAuthorization.mockResolvedValue({ data: null, error: { message: 'consent rejected' } })

    renderPage({ supabase, user, navigate })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-approve')).toBeTruthy())
    fireEvent.click(screen.getByTestId('oauth-consent-approve'))

    await waitFor(() => expect(screen.getByText('consent rejected')).toBeTruthy())
    expect(navigate).not.toHaveBeenCalled()
  })

  it('surfaces thrown approval errors', async () => {
    const { supabase, oauth } = createSupabase()
    oauth.getAuthorizationDetails.mockResolvedValue({ data: details, error: null })
    oauth.denyAuthorization.mockRejectedValue({ message: 'offline' })

    renderPage({ supabase, user })

    await waitFor(() => expect(screen.getByTestId('oauth-consent-deny')).toBeTruthy())
    fireEvent.click(screen.getByTestId('oauth-consent-deny'))

    await waitFor(() => expect(screen.getByText('offline')).toBeTruthy())
  })
})
