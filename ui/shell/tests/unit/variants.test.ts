import { SHELL_VARIANTS, oauthRedirectUri, publicWebOriginFor, resolveVariant, schemeFor } from '@ui/shell/variants'

describe('shell variants', () => {
  const originalScheme = process.env.NEXT_PUBLIC_SHELL_SCHEME
  const originalShellScheme = process.env.SHELL_SCHEME

  const restore = (name: string, value: string | undefined) => {
    // Assigning undefined would store the literal string "undefined".
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }

  afterEach(() => {
    restore('NEXT_PUBLIC_SHELL_SCHEME', originalScheme)
    restore('SHELL_SCHEME', originalShellScheme)
  })

  it.each(['dev', 'stage', 'prod'] as const)('resolves the %s variant', (variant) => {
    expect(resolveVariant(variant)).toBe(variant)
  })

  it.each([undefined, '', 'production', 'STAGE'])('falls back to dev for %p', (value) => {
    expect(resolveVariant(value)).toBe('dev')
  })

  it('uses the schemes already registered in Supabase', () => {
    // Inherited from the retired React Native app, which is what lets the shell
    // authenticate without a dashboard change.
    expect(schemeFor('dev')).toBe('everfreenote-dev')
    expect(schemeFor('stage')).toBe('everfreenote-stage')
    expect(schemeFor('prod')).toBe('everfreenote')
  })

  it('keeps app ids distinct from ui/mobile so both can be installed', () => {
    const appIds = Object.values(SHELL_VARIANTS).map((variant) => variant.appId)
    expect(appIds).toEqual(['com.everfreenote.shell.dev', 'com.everfreenote.shell.stage', 'com.everfreenote.shell'])
    expect(new Set(appIds).size).toBe(appIds.length)
  })

  it.each([
    ['NEXT_PUBLIC_SHELL_SCHEME', 'efn-public'],
    ['SHELL_SCHEME', 'efn-build'],
  ])('lets %s override the scheme', (variable, value) => {
    delete process.env.NEXT_PUBLIC_SHELL_SCHEME
    delete process.env.SHELL_SCHEME
    process.env[variable] = value

    expect(schemeFor('stage')).toBe(value)
    expect(oauthRedirectUri('stage')).toBe(`${value}://auth/callback`)
  })

  it('ignores a blank override', () => {
    process.env.NEXT_PUBLIC_SHELL_SCHEME = '   '
    delete process.env.SHELL_SCHEME

    expect(schemeFor('prod')).toBe('everfreenote')
  })

  describe('publicWebOriginFor', () => {
    const originalGeneric = process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN
    const originalStage = process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE

    afterEach(() => {
      restore('NEXT_PUBLIC_PUBLIC_WEB_ORIGIN', originalGeneric)
      restore('NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE', originalStage)
    })

    it('prefers the variant-suffixed value', () => {
      process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN = 'https://generic.example.com'
      process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE = 'https://stage.example.com'

      expect(publicWebOriginFor('stage')).toBe('https://stage.example.com')
    })

    it('falls back to the unsuffixed value', () => {
      delete process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE
      process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN = 'https://generic.example.com'

      expect(publicWebOriginFor('stage')).toBe('https://generic.example.com')
    })

    it.each(['', '   '])('treats %p as unset rather than as an origin', (value) => {
      process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE = value
      process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN = value

      // No hardcoded deployment hostname exists to fall back to, by design.
      expect(publicWebOriginFor('stage')).toBe('')
    })
  })

  it('builds the redirect URI Supabase is configured with', () => {
    delete process.env.NEXT_PUBLIC_SHELL_SCHEME
    delete process.env.SHELL_SCHEME

    expect(oauthRedirectUri('stage')).toBe('everfreenote-stage://auth/callback')
  })
})
