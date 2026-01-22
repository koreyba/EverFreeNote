const loadLocalBundle = (platform: 'android' | 'ios' | 'web') => {
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
  it('returns android asset URL when running on android', () => {
    const { getLocalBundleUrl, shouldLocalBundleExist } = loadLocalBundle('android')

    expect(shouldLocalBundleExist()).toBe(true)
    expect(getLocalBundleUrl()).toBe('file:///android_asset/web-editor/index.html')
  })

  it('returns bundle path when running on ios', () => {
    const { getLocalBundleUrl, shouldLocalBundleExist } = loadLocalBundle('ios')

    expect(shouldLocalBundleExist()).toBe(true)
    expect(getLocalBundleUrl()).toBe('WebEditor/index.html')
  })

  it('returns null when running on unsupported platform', () => {
    const { getLocalBundleUrl, shouldLocalBundleExist } = loadLocalBundle('web')

    expect(shouldLocalBundleExist()).toBe(false)
    expect(getLocalBundleUrl()).toBeNull()
  })
})
