import { Capacitor } from '@capacitor/core'

import {
  isNativeShell,
  shellOAuthRedirectUri,
  shellPublicWebOrigin,
  shellScheme,
  shellVariant,
} from '@ui/shell/runtime/platform'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: jest.fn() },
}))

const mockIsNativePlatform = jest.mocked(Capacitor.isNativePlatform)

describe('shell platform detection', () => {
  const originalVariant = process.env.NEXT_PUBLIC_APP_VARIANT

  afterEach(() => {
    if (originalVariant === undefined) delete process.env.NEXT_PUBLIC_APP_VARIANT
    else process.env.NEXT_PUBLIC_APP_VARIANT = originalVariant
  })

  it.each([true, false])('reports isNativeShell as %p', (native) => {
    mockIsNativePlatform.mockReturnValue(native)
    expect(isNativeShell()).toBe(native)
  })

  it('reads the variant baked in at build time', () => {
    process.env.NEXT_PUBLIC_APP_VARIANT = 'stage'
    expect(shellVariant()).toBe('stage')
    expect(shellScheme()).toBe('everfreenote-stage')
    expect(shellOAuthRedirectUri()).toBe('everfreenote-stage://auth/callback')
  })

  it('reads the public web origin from the environment, never from code', () => {
    process.env.NEXT_PUBLIC_APP_VARIANT = 'stage'
    process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE = 'https://stage.example.com'

    expect(shellPublicWebOrigin()).toBe('https://stage.example.com')
    delete process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE
  })

  it('reports an unconfigured deployment as empty rather than guessing', () => {
    // Falling back to the WebView origin would hand out https://localhost links.
    process.env.NEXT_PUBLIC_APP_VARIANT = 'prod'
    expect(shellPublicWebOrigin()).toBe('')
  })

  it('falls back to dev when the build did not set a variant', () => {
    delete process.env.NEXT_PUBLIC_APP_VARIANT
    expect(shellVariant()).toBe('dev')
    expect(shellOAuthRedirectUri()).toBe('everfreenote-dev://auth/callback')
  })
})
