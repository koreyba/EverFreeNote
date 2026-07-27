describe('featureFlags', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  const loadFeatureFlags = (): typeof import('../../featureFlags').featureFlags => {
    let featureFlags: typeof import('../../featureFlags').featureFlags | undefined

    jest.isolateModules(() => {
      featureFlags = require('../../featureFlags').featureFlags
    })

    if (featureFlags === undefined) {
      throw new Error('featureFlags was not initialized')
    }

    return featureFlags
  }

  it('enables testAuth when variant is dev and EXPO_PUBLIC_ENABLE_TEST_AUTH is true', () => {
    process.env.APP_VARIANT = 'dev'
    delete process.env.EXPO_PUBLIC_APP_VARIANT
    process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH = 'true'

    const featureFlags = loadFeatureFlags()

    expect(featureFlags.testAuth).toBe(true)
  })

  it('disables testAuth when variant is prod even if EXPO_PUBLIC_ENABLE_TEST_AUTH is true', () => {
    process.env.APP_VARIANT = 'prod'
    process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH = 'true'

    const featureFlags = loadFeatureFlags()

    expect(featureFlags.testAuth).toBe(false)
  })

  it('disables testAuth when variant is production', () => {
    delete process.env.APP_VARIANT
    process.env.EXPO_PUBLIC_APP_VARIANT = 'production'
    process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH = 'true'

    const featureFlags = loadFeatureFlags()

    expect(featureFlags.testAuth).toBe(false)
  })

  it('defaults to dev variant when no variant env vars are set and testAuth is false by default', () => {
    delete process.env.APP_VARIANT
    delete process.env.EXPO_PUBLIC_APP_VARIANT
    delete process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH

    const featureFlags = loadFeatureFlags()

    expect(featureFlags.testAuth).toBe(false)
  })

  it('defaults to dev variant when no variant env vars are set and enables testAuth if EXPO_PUBLIC_ENABLE_TEST_AUTH is true', () => {
    delete process.env.APP_VARIANT
    delete process.env.EXPO_PUBLIC_APP_VARIANT
    process.env.EXPO_PUBLIC_ENABLE_TEST_AUTH = 'true'

    const featureFlags = loadFeatureFlags()

    expect(featureFlags.testAuth).toBe(true)
  })
})
