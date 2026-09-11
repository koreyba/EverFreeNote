import { resolvePublicWebOrigin } from '@ui/web/adapters/publicWebOrigin'
import { isNativeShell, shellPublicWebOrigin } from '@ui/shell/runtime/platform'

jest.mock('@ui/shell/runtime/platform', () => ({
  isNativeShell: jest.fn(),
  shellPublicWebOrigin: jest.fn(),
}))

describe('resolvePublicWebOrigin', () => {
  it('uses the serving origin in a browser', () => {
    jest.mocked(isNativeShell).mockReturnValue(false)

    // jsdom serves the tests from http://localhost
    expect(resolvePublicWebOrigin()).toBe(globalThis.location.origin)
  })

  it('uses the deployed origin inside the shell, not the WebView origin', () => {
    jest.mocked(isNativeShell).mockReturnValue(true)
    jest.mocked(shellPublicWebOrigin).mockReturnValue('https://stage.everfreenote.pages.dev')

    // https://localhost would be meaningless to whoever receives the link.
    expect(resolvePublicWebOrigin()).toBe('https://stage.everfreenote.pages.dev')
  })

  it('reports an unconfigured shell build as empty', () => {
    jest.mocked(isNativeShell).mockReturnValue(true)
    jest.mocked(shellPublicWebOrigin).mockReturnValue('')

    expect(resolvePublicWebOrigin()).toBe('')
  })
})
