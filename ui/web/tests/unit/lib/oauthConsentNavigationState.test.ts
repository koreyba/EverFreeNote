import {
  OAUTH_CONSENT_PATH,
  buildOAuthConsentPath,
  clearOAuthConsentAuthorizationId,
  consumeOAuthConsentReturnPath,
  isValidAuthorizationId,
  readOAuthConsentAuthorizationId,
  saveOAuthConsentAuthorizationId,
} from '@ui/web/lib/oauthConsentNavigationState'

const STORAGE_KEY = 'everfreenote:oauth-consent-authorization-id'

describe('oauthConsentNavigationState', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('validates authorization ids', () => {
    expect(isValidAuthorizationId('abc-123_DEF.~')).toBe(true)
    expect(isValidAuthorizationId('')).toBe(false)
    expect(isValidAuthorizationId('has space')).toBe(false)
    expect(isValidAuthorizationId('a/b')).toBe(false)
    expect(isValidAuthorizationId('x'.repeat(256))).toBe(false)
    expect(isValidAuthorizationId(null)).toBe(false)
    expect(isValidAuthorizationId(42)).toBe(false)
  })

  it('builds the consent path with an encoded id', () => {
    expect(buildOAuthConsentPath('abc~1')).toBe(`${OAUTH_CONSENT_PATH}?authorization_id=abc~1`)
  })

  it('saves, reads and consumes a pending authorization id', () => {
    expect(saveOAuthConsentAuthorizationId('auth-1')).toBe(true)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('auth-1')
    expect(readOAuthConsentAuthorizationId()).toBe('auth-1')

    expect(consumeOAuthConsentReturnPath()).toBe(`${OAUTH_CONSENT_PATH}?authorization_id=auth-1`)
    expect(readOAuthConsentAuthorizationId()).toBeNull()
    expect(consumeOAuthConsentReturnPath()).toBeNull()
  })

  it('refuses to save invalid ids', () => {
    expect(saveOAuthConsentAuthorizationId('bad id')).toBe(false)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('ignores tampered stored values', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'javascript:alert(1)')
    expect(readOAuthConsentAuthorizationId()).toBeNull()
    expect(consumeOAuthConsentReturnPath()).toBeNull()
  })

  it('clears the stored id', () => {
    saveOAuthConsentAuthorizationId('auth-2')
    clearOAuthConsentAuthorizationId()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('degrades gracefully when sessionStorage throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })

    try {
      expect(saveOAuthConsentAuthorizationId('auth-3')).toBe(false)
      expect(readOAuthConsentAuthorizationId()).toBeNull()
      expect(consumeOAuthConsentReturnPath()).toBeNull()
      expect(() => clearOAuthConsentAuthorizationId()).not.toThrow()
    } finally {
      if (descriptor) Object.defineProperty(window, 'sessionStorage', descriptor)
    }
  })

  it('degrades gracefully when storage operations throw', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const removeItem = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })

    try {
      expect(saveOAuthConsentAuthorizationId('auth-4')).toBe(false)
      expect(readOAuthConsentAuthorizationId()).toBeNull()
      expect(() => clearOAuthConsentAuthorizationId()).not.toThrow()
    } finally {
      setItem.mockRestore()
      getItem.mockRestore()
      removeItem.mockRestore()
    }
  })
})
