import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import {
  getSupabaseConfig,
  getOAuthRedirectUrl,
  getPublicWebOrigin,
} from '../../adapters/config'

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: undefined,
  },
}))

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://127.0.0.1:8081/--/${path}`),
}))

describe('config adapter', () => {
  const ENV_KEYS = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL',
    'EXPO_PUBLIC_OAUTH_REDIRECT_URL',
    'EXPO_PUBLIC_PUBLIC_WEB_ORIGIN',
    'EXPO_PUBLIC_EDITOR_WEBVIEW_URL',
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of ENV_KEYS) {
      delete process.env[key]
    }
    ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = undefined
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key]
    }
    ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = undefined
  })

  describe('getSupabaseConfig', () => {
    it('throws error when configuration is missing from both expoConfig and process.env', () => {
      expect(() => getSupabaseConfig()).toThrow(
        'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      )
    })

    it('throws error when only supabaseUrl is provided but key is missing', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
      expect(() => getSupabaseConfig()).toThrow(
        'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      )
    })

    it('throws error when only key is provided but url is missing', () => {
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key-123'
      expect(() => getSupabaseConfig()).toThrow(
        'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      )
    })

    it('returns config from Constants.expoConfig.extra when present', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          supabaseUrl: 'https://extra.supabase.co',
          supabasePublishableKey: 'extra-anon-key',
          supabaseFunctionsUrl: 'https://extra-fn.supabase.co',
        },
      }

      const config = getSupabaseConfig()

      expect(config).toEqual({
        url: 'https://extra.supabase.co',
        anonKey: 'extra-anon-key',
        functionsUrl: 'https://extra-fn.supabase.co',
      })
    })

    it('falls back functionsUrl to url when supabaseFunctionsUrl is omitted in expoConfig.extra', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          supabaseUrl: 'https://extra.supabase.co',
          supabasePublishableKey: 'extra-anon-key',
        },
      }

      const config = getSupabaseConfig()

      expect(config).toEqual({
        url: 'https://extra.supabase.co',
        anonKey: 'extra-anon-key',
        functionsUrl: 'https://extra.supabase.co',
      })
    })

    it('returns config from process.env when expoConfig is empty', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://env.supabase.co'
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'env-anon-key'
      process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL = 'https://env-fn.supabase.co'

      const config = getSupabaseConfig()

      expect(config).toEqual({
        url: 'https://env.supabase.co',
        anonKey: 'env-anon-key',
        functionsUrl: 'https://env-fn.supabase.co',
      })
    })

    it('falls back functionsUrl to url when EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL is omitted in process.env', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://env.supabase.co'
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'env-anon-key'

      const config = getSupabaseConfig()

      expect(config).toEqual({
        url: 'https://env.supabase.co',
        anonKey: 'env-anon-key',
        functionsUrl: 'https://env.supabase.co',
      })
    })
  })

  describe('getOAuthRedirectUrl', () => {
    it('returns trimmed oauthRedirectUrl from Constants.expoConfig.extra', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          oauthRedirectUrl: '   myapp://oauth/callback   ',
        },
      }

      expect(getOAuthRedirectUrl()).toBe('myapp://oauth/callback')
    })

    it('returns trimmed oauthRedirectUrl from process.env when expoConfig is empty', () => {
      process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL = 'envapp://callback'

      expect(getOAuthRedirectUrl()).toBe('envapp://callback')
    })

    it('falls back to scheme from expoConfig if oauthRedirectUrl is not configured', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        scheme: 'everfreenote-dev',
      }

      expect(getOAuthRedirectUrl()).toBe('everfreenote-dev://auth/callback')
    })

    it('falls back to Linking.createURL when oauthRedirectUrl and scheme are missing', () => {
      const url = getOAuthRedirectUrl()

      expect(Linking.createURL).toHaveBeenCalledWith('auth/callback')
      expect(url).toBe('exp://127.0.0.1:8081/--/auth/callback')
    })
  })

  describe('getPublicWebOrigin', () => {
    it('returns origin for valid http publicWebOrigin from expoConfig.extra', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          publicWebOrigin: 'https://app.everfreenote.com/notes?id=1',
        },
      }

      expect(getPublicWebOrigin()).toBe('https://app.everfreenote.com')
    })

    it('returns origin for valid http publicWebOrigin from process.env', () => {
      process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN = 'http://localhost:3000/app'

      expect(getPublicWebOrigin()).toBe('http://localhost:3000')
    })

    it('falls back to editorWebViewUrl when publicWebOrigin is an invalid URL', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          publicWebOrigin: 'not-a-valid-url',
          editorWebViewUrl: 'https://editor.everfreenote.com/index.html',
        },
      }

      expect(getPublicWebOrigin()).toBe('https://editor.everfreenote.com')
    })

    it('falls back to editorWebViewUrl when publicWebOrigin uses non-http/https protocol', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          publicWebOrigin: 'file:///local/file.html',
          editorWebViewUrl: 'https://editor.everfreenote.com/index.html',
        },
      }

      expect(getPublicWebOrigin()).toBe('https://editor.everfreenote.com')
    })

    it('returns origin from editorWebViewUrl in process.env when publicWebOrigin is empty', () => {
      process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL = 'http://192.168.0.10:8080/editor'

      expect(getPublicWebOrigin()).toBe('http://192.168.0.10:8080')
    })

    it('returns empty string when both publicWebOrigin and editorWebViewUrl are missing', () => {
      expect(getPublicWebOrigin()).toBe('')
    })

    it('returns empty string when editorWebViewUrl is non-http protocol (e.g. android asset)', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          editorWebViewUrl: 'file:///android_asset/web-editor/index.html',
        },
      }

      expect(getPublicWebOrigin()).toBe('')
    })

    it('returns empty string when editorWebViewUrl is invalid URL string', () => {
      ;(Constants as unknown as { expoConfig?: unknown }).expoConfig = {
        extra: {
          editorWebViewUrl: 'invalid url',
        },
      }

      expect(getPublicWebOrigin()).toBe('')
    })
  })
})
