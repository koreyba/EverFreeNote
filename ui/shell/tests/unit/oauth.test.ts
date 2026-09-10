import { Browser } from '@capacitor/browser'

import { nativeOAuthAdapter } from '@ui/shell/runtime/oauth'

jest.mock('@capacitor/browser', () => ({
  Browser: { open: jest.fn() },
}))

describe('native OAuth adapter', () => {
  it('opens the provider URL in a Custom Tab', async () => {
    jest.mocked(Browser.open).mockResolvedValue()

    await nativeOAuthAdapter.startOAuth('https://provider.example/authorize?x=1')

    // A Custom Tab rather than the app's own WebView: Google rejects OAuth in
    // embedded WebViews with disallowed_useragent.
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://provider.example/authorize?x=1' })
  })

  it('propagates failures to open the browser', async () => {
    jest.mocked(Browser.open).mockRejectedValue(new Error('no browser'))

    await expect(nativeOAuthAdapter.startOAuth('https://provider.example')).rejects.toThrow('no browser')
  })
})
