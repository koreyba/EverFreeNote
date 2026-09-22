import { useAppBackHandler } from '@ui/web/lib/appBack'
import { render, waitFor, act } from '@testing-library/react'
import { App } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'
import { Browser } from '@capacitor/browser'
import { useRouter } from 'next/navigation'

import { NativeShellProvider } from '@ui/shell/runtime/NativeShellProvider'
import { isNativeShell, shellScheme } from '@ui/shell/runtime/platform'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'

jest.mock('@capacitor/keyboard', () => ({ Keyboard: { addListener: jest.fn(), hide: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@capacitor/app', () => ({ App: { addListener: jest.fn(), exitApp: jest.fn() } }))
jest.mock('@capacitor/browser', () => ({ Browser: { close: jest.fn() } }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({ useSupabase: jest.fn() }))
jest.mock('@ui/shell/runtime/platform', () => ({
  isNativeShell: jest.fn(),
  shellScheme: jest.fn(() => 'everfreenote-stage'),
}))

type Handler = (event: never) => void

const replace = jest.fn()
const exchangeCodeForSession = jest.fn()
const removeListener = jest.fn().mockResolvedValue(undefined)

/** Captures the handlers registered with App.addListener, keyed by event name. */
function registeredHandlers() {
  const handlers: Record<string, Handler> = {}
  jest.mocked(Keyboard.addListener).mockImplementation(((event: string, handler: Handler) => {
    handlers[event] = handler
    return Promise.resolve({ remove: jest.fn() })
  }) as never)
  jest.mocked(App.addListener).mockImplementation(((event: string, handler: Handler) => {
    handlers[event] = handler
    return Promise.resolve({ remove: removeListener })
  }) as never)
  return handlers
}

const renderProvider = () =>
  render(
    <NativeShellProvider>
      <span>app</span>
    </NativeShellProvider>
  )

beforeEach(() => {
  jest.mocked(useRouter).mockReturnValue({ replace } as never)
  jest.mocked(useSupabase).mockReturnValue({
    supabase: { auth: { exchangeCodeForSession } },
    user: null,
    loading: false,
  } as never)
  jest.mocked(isNativeShell).mockReturnValue(true)
  jest.mocked(shellScheme).mockReturnValue('everfreenote-stage')
  jest.mocked(Browser.close).mockResolvedValue()
  exchangeCodeForSession.mockResolvedValue({ error: null })
})

describe('NativeShellProvider', () => {
  it('renders children and registers nothing in a browser', () => {
    jest.mocked(isNativeShell).mockReturnValue(false)

    const { getByText } = renderProvider()

    expect(getByText('app')).toBeTruthy()
    expect(App.addListener).not.toHaveBeenCalled()
  })

  it('exchanges the callback code for a session and returns to the app', async () => {
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.appUrlOpen).toBeDefined())

    handlers.appUrlOpen({ url: 'everfreenote-stage://auth/callback?code=abc123' } as never)

    // The Custom Tab has to be dismissed explicitly; it stays on top otherwise.
    await waitFor(() => expect(Browser.close).toHaveBeenCalled())
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })

  it('still completes the exchange when the tab was already dismissed', async () => {
    jest.mocked(Browser.close).mockRejectedValue(new Error('already closed'))
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.appUrlOpen).toBeDefined())

    handlers.appUrlOpen({ url: 'everfreenote-stage://auth/callback?code=abc123' } as never)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })

  it('surfaces a provider error without attempting an exchange', async () => {
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.appUrlOpen).toBeDefined())

    handlers.appUrlOpen({
      url: 'everfreenote-stage://auth/callback?error=access_denied&error_description=User%20said%20no',
    } as never)

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/?error=auth_callback_failed&message=User%20said%20no')
    )
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('surfaces a failed exchange', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') })
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.appUrlOpen).toBeDefined())

    handlers.appUrlOpen({ url: 'everfreenote-stage://auth/callback?code=abc123' } as never)

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/?error=auth_callback_failed&message=bad%20code')
    )
  })

  it.each([
    ['a different scheme', 'other-app://auth/callback?code=abc123'],
    ['a callback without a code', 'everfreenote-stage://auth/callback'],
  ])('ignores %s', async (_name, url) => {
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.appUrlOpen).toBeDefined())

    handlers.appUrlOpen({ url } as never)

    await waitFor(() => expect(exchangeCodeForSession).not.toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it('walks back through history and only exits from the first screen', async () => {
    const back = jest.spyOn(globalThis.history, 'back').mockImplementation(() => undefined)
    const handlers = registeredHandlers()
    renderProvider()
    await waitFor(() => expect(handlers.backButton).toBeDefined())

    globalThis.history.replaceState({}, '', '/other-screen')
    handlers.backButton({ canGoBack: true } as never)
    await waitFor(() => expect(back).toHaveBeenCalled())
    expect(App.exitApp).not.toHaveBeenCalled()

    handlers.backButton({ canGoBack: false } as never)
    await waitFor(() => expect(App.exitApp).toHaveBeenCalled())
    globalThis.history.replaceState({}, '', '/')
    back.mockRestore()
  })

  it('removes its listeners on unmount', async () => {
    registeredHandlers()
    const { unmount } = renderProvider()
    await waitFor(() => expect(App.addListener).toHaveBeenCalledTimes(2))

    unmount()

    await waitFor(() => expect(removeListener).toHaveBeenCalledTimes(2))
  })
})

it('hides the keyboard before navigating or exiting', async () => {
  const back = jest.spyOn(globalThis.history, 'back').mockImplementation()
  const handlers = registeredHandlers()
  renderProvider()
  await waitFor(() => expect(handlers.keyboardDidShow).toBeDefined())
  handlers.keyboardDidShow({ keyboardHeight: 280 } as never)
  handlers.backButton({ canGoBack: true } as never)
  await waitFor(() => expect(Keyboard.hide).toHaveBeenCalledTimes(1))
  expect(back).not.toHaveBeenCalled()
  expect(App.exitApp).not.toHaveBeenCalled()
  back.mockRestore()
})

function SavingScreen({ save }: { save: () => Promise<boolean> }) {
  useAppBackHandler(10, save)
  return null
}

it('ignores repeated Back presses during a save and never exits after a failed save', async () => {
  let failSave: (error: Error) => void = () => {}
  const saving = new Promise<boolean>((_resolve, reject) => { failSave = reject })
  const save = jest.fn(() => saving)
  const log = jest.spyOn(console, 'error').mockImplementation()
  const handlers = registeredHandlers()
  render(<NativeShellProvider><SavingScreen save={save} /></NativeShellProvider>)
  handlers.backButton({ canGoBack: false } as never)
  handlers.backButton({ canGoBack: false } as never)
  expect(save).toHaveBeenCalledTimes(1)
  expect(App.exitApp).not.toHaveBeenCalled()
  await act(async () => { failSave(new Error('Storage full')) })
  expect(log).toHaveBeenCalledWith('[shell] failed to handle Back', expect.any(Error))
  expect(App.exitApp).not.toHaveBeenCalled()
  log.mockRestore()
})

it('exits from the notes root even if Settings added browser history', async () => {
  const handlers = registeredHandlers()
  const back = jest.spyOn(globalThis.history, 'back').mockImplementation()
  globalThis.history.replaceState({}, '', '/')
  renderProvider()
  handlers.backButton({ canGoBack: true } as never)
  await waitFor(() => expect(App.exitApp).toHaveBeenCalledTimes(1))
  expect(back).not.toHaveBeenCalled()
  back.mockRestore()
})
