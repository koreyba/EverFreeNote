import * as WebBrowser from 'expo-web-browser'
import { getOAuthRedirectUrl } from '../../adapters/config'
import { oauthAdapter } from '../../adapters/oauth'

jest.mock('expo-web-browser', () => ({
  warmUpAsync: jest.fn().mockResolvedValue(undefined),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'success', url: 'app://callback' }),
  coolDownAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../adapters/config', () => ({
  getOAuthRedirectUrl: jest.fn().mockReturnValue('everfreenote-dev://auth/callback'),
}))

describe('oauthAdapter', () => {
  const mockWarmUp = WebBrowser.warmUpAsync as jest.Mock
  const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock
  const mockCoolDown = WebBrowser.coolDownAsync as jest.Mock
  const mockGetOAuthRedirectUrl = getOAuthRedirectUrl as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetOAuthRedirectUrl.mockReturnValue('everfreenote-dev://auth/callback')
    mockWarmUp.mockResolvedValue(undefined)
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'everfreenote-dev://auth/callback?code=abc' })
    mockCoolDown.mockResolvedValue(undefined)
  })

  describe('startOAuth', () => {
    it('executes warmUp, openAuthSessionAsync, and coolDown with correct arguments on success', async () => {
      const authUrl = 'https://example.supabase.co/auth/v1/authorize?provider=google'

      await oauthAdapter.startOAuth(authUrl)

      expect(mockGetOAuthRedirectUrl).toHaveBeenCalledTimes(1)
      expect(mockWarmUp).toHaveBeenCalledTimes(1)
      expect(mockOpenAuthSession).toHaveBeenCalledWith(authUrl, 'everfreenote-dev://auth/callback')
      expect(mockCoolDown).toHaveBeenCalledTimes(1)
    })

    it('handles result.type = "cancel" gracefully without throwing', async () => {
      mockOpenAuthSession.mockResolvedValueOnce({ type: 'cancel' })
      const authUrl = 'https://example.supabase.co/auth/v1/authorize?provider=github'

      await expect(oauthAdapter.startOAuth(authUrl)).resolves.toBeUndefined()

      expect(mockWarmUp).toHaveBeenCalledTimes(1)
      expect(mockOpenAuthSession).toHaveBeenCalledWith(authUrl, 'everfreenote-dev://auth/callback')
      expect(mockCoolDown).toHaveBeenCalledTimes(1)
    })

    it('handles result.type = "dismiss" or other non-success types gracefully', async () => {
      mockOpenAuthSession.mockResolvedValueOnce({ type: 'dismiss' })
      const authUrl = 'https://example.supabase.co/auth/v1/authorize?provider=apple'

      await expect(oauthAdapter.startOAuth(authUrl)).resolves.toBeUndefined()

      expect(mockCoolDown).toHaveBeenCalledTimes(1)
    })

    it('re-throws error when openAuthSessionAsync fails', async () => {
      const error = new Error('Browser failed to launch')
      mockOpenAuthSession.mockRejectedValueOnce(error)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

      const authUrl = 'https://example.supabase.co/auth/v1/authorize?provider=google'

      await expect(oauthAdapter.startOAuth(authUrl)).rejects.toThrow('Browser failed to launch')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[OAuth] Error starting OAuth flow:', error)

      consoleErrorSpy.mockRestore()
    })

    it('re-throws error when warmUpAsync fails', async () => {
      const error = new Error('Warmup failed')
      mockWarmUp.mockRejectedValueOnce(error)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

      await expect(oauthAdapter.startOAuth('https://auth.com')).rejects.toThrow('Warmup failed')

      expect(consoleErrorSpy).toHaveBeenCalledWith('[OAuth] Error starting OAuth flow:', error)

      consoleErrorSpy.mockRestore()
    })
  })
})
