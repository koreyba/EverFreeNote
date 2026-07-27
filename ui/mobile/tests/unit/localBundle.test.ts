const loadLocalBundle = (platform: 'android' | 'ios' | 'web' | 'windows' | 'macos') => {
  jest.resetModules()
  jest.doMock('react-native', () => {
    return {
      Platform: {
        OS: platform,
      },
    }
  })

  return require('@ui/mobile/utils/localBundle') as typeof import('@ui/mobile/utils/localBundle')
}

describe('local bundle helpers', () => {
  const platformCases = [
    {
      platform: 'android',
      shouldLocalBundleExist: true,
      expectedUrl: 'file:///android_asset/web-editor/index.html',
    },
    {
      platform: 'ios',
      shouldLocalBundleExist: true,
      expectedUrl: 'WebEditor/index.html',
    },
    { platform: 'web', shouldLocalBundleExist: false, expectedUrl: null },
    { platform: 'windows', shouldLocalBundleExist: false, expectedUrl: null },
    { platform: 'macos', shouldLocalBundleExist: false, expectedUrl: null },
  ] as const

  it.each(platformCases)('returns expected bundle values for $platform', ({
    platform,
    shouldLocalBundleExist: expectedBundleExistence,
    expectedUrl,
  }) => {
    const { getLocalBundleUrl, shouldLocalBundleExist } = loadLocalBundle(platform)

    expect(shouldLocalBundleExist()).toBe(expectedBundleExistence)
    expect(getLocalBundleUrl()).toBe(expectedUrl)
  })
})
