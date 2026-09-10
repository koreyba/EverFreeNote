import { resolveOAuthAdapter, resolveOAuthRedirectUri, webOAuthAdapter } from '@ui/web/adapters/oauth'
import { webNavigationAdapter } from '@ui/web/adapters/navigation'
import { isNativeShell, shellOAuthRedirectUri } from '@ui/shell/runtime/platform'

jest.mock('@ui/web/adapters/navigation', () => ({ webNavigationAdapter: { navigate: jest.fn() } }))
jest.mock('@ui/web/config', () => ({ webOAuthRedirectUri: 'https://app.example/auth/callback' }))
jest.mock('@ui/shell/runtime/platform', () => ({
  isNativeShell: jest.fn(),
  shellOAuthRedirectUri: jest.fn(() => 'everfreenote-stage://auth/callback'),
}))
jest.mock('@ui/shell/runtime/oauth', () => ({ nativeOAuthAdapter: { startOAuth: jest.fn() } }))

describe('web OAuth adapter', () => {
  it('navigates the page to the provider, replacing history', async () => {
    await webOAuthAdapter.startOAuth('https://provider.example/authorize')

    // replace, so the back button does not land the user on the provider again.
    expect(webNavigationAdapter.navigate).toHaveBeenCalledWith('https://provider.example/authorize', {
      replace: true,
    })
  })
})

describe('OAuth platform resolution', () => {
  it('uses the web adapter and the app origin in a browser', async () => {
    jest.mocked(isNativeShell).mockReturnValue(false)

    expect(await resolveOAuthAdapter()).toBe(webOAuthAdapter)
    expect(resolveOAuthRedirectUri()).toBe('https://app.example/auth/callback')
  })

  it('uses the Custom Tab adapter and the custom scheme inside the shell', async () => {
    jest.mocked(isNativeShell).mockReturnValue(true)
    const { nativeOAuthAdapter } = await import('@ui/shell/runtime/oauth')

    expect(await resolveOAuthAdapter()).toBe(nativeOAuthAdapter)
    expect(resolveOAuthRedirectUri()).toBe('everfreenote-stage://auth/callback')
    expect(shellOAuthRedirectUri).toHaveBeenCalled()
  })
})
