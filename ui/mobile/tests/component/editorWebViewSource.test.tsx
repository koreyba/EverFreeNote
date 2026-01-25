import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

const mockPostMessage = jest.fn()
let lastWebViewProps: {
  source?: { uri?: string }
  onError?: (event: { nativeEvent: { description?: string } }) => void
  onHttpError?: (event: { nativeEvent: { statusCode?: number; description?: string } }) => void
  onMessage?: (event: { nativeEvent: { data: string } }) => void
} | null = null
let mockNetInfoListener: ((state: { isConnected?: boolean }) => void) | null = null
let mockNetInfoState: { isConnected?: boolean } = { isConnected: true }
let mockLocalBundleUrl: string | null = 'file:///android_asset/web-editor/index.html'

const mockExpoConfig = {
  extra: {
    appVariant: 'dev',
    editorWebViewUrl: 'http://example.dev/editor-webview',
  },
  hostUri: 'localhost:8081',
}

jest.mock('react-native-webview', () => {
  const React = require('react')
  const { View } = require('react-native')

  return {
    WebView: React.forwardRef((props: typeof lastWebViewProps, ref: unknown) => {
      lastWebViewProps = props

      React.useImperativeHandle(ref, () => ({
        postMessage: mockPostMessage,
      }))

      return <View testID="webview" />
    }),
  }
})

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: mockExpoConfig,
  },
  expoConfig: mockExpoConfig,
}))

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: jest.fn((listener: (state: { isConnected?: boolean }) => void) => {
      mockNetInfoListener = listener
      listener(mockNetInfoState)
      return jest.fn()
    }),
  },
  addEventListener: jest.fn((listener: (state: { isConnected?: boolean }) => void) => {
    mockNetInfoListener = listener
    listener(mockNetInfoState)
    return jest.fn()
  }),
}))

jest.mock('@ui/mobile/utils/localBundle', () => ({
  getLocalBundleUrl: jest.fn(() => mockLocalBundleUrl),
}))

jest.mock('@ui/mobile/adapters', () => ({
  getSupabaseConfig: () => ({ url: 'https://test.supabase.co' }),
}))

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#00aa00',
      destructive: '#ff0000',
      mutedForeground: '#666666',
      border: '#111111',
      foreground: '#000000',
    },
    colorScheme: 'light',
  }),
}))

import EditorWebView from '@ui/mobile/components/EditorWebView'

const setNetInfo = (state: { isConnected?: boolean }) => {
  mockNetInfoState = state
  mockNetInfoListener?.(state)
}

const sendReady = () => {
  act(() => {
    lastWebViewProps?.onMessage?.({
      nativeEvent: { data: JSON.stringify({ type: 'READY' }) },
    })
  })
}

describe('EditorWebView source selection', () => {
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    lastWebViewProps = null
    mockNetInfoState = { isConnected: true }
    mockLocalBundleUrl = 'file:///android_asset/web-editor/index.html'
    mockExpoConfig.extra = {
      appVariant: 'dev',
      editorWebViewUrl: 'http://example.dev/editor-webview',
    }
    const constantsModule = require('expo-constants') as { default?: { expoConfig?: unknown }; expoConfig?: unknown }
    if (constantsModule.default) {
      constantsModule.default.expoConfig = mockExpoConfig
    }
    constantsModule.expoConfig = mockExpoConfig
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    jest.useRealTimers()
  })

  it('selects remote when online', async () => {
    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    sendReady()
  })

  it('selects local when offline', async () => {
    setNetInfo({ isConnected: false })

    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
    })
  })

  it('falls back to local on load error', async () => {
    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    act(() => {
      lastWebViewProps?.onError?.({ nativeEvent: { description: 'Load failed' } })
    })

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
    })
  })

  it('falls back to local on HTTP error', async () => {
    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    act(() => {
      lastWebViewProps?.onHttpError?.({ nativeEvent: { statusCode: 500, description: 'Server error' } })
    })

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
    })
  })

  it('falls back to local on READY timeout and surfaces the reason in dev', async () => {
    jest.useFakeTimers()

    const { getByText } = render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
    })

    const badge = getByText('local')
    fireEvent.press(badge)
    expect(getByText(/ready-timeout/)).toBeTruthy()

    jest.useRealTimers()
  })

  it('does not fallback after READY', async () => {
    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    sendReady()

    act(() => {
      lastWebViewProps?.onError?.({ nativeEvent: { description: 'Late error' } })
    })

    expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
  })

  it('shows error UI when no local or remote URL exists', () => {
    mockLocalBundleUrl = null
    mockExpoConfig.extra = {
      appVariant: 'dev',
      editorWebViewUrl: '',
    }

    const { getByText } = render(<EditorWebView initialContent="" />)

    expect(getByText('Editor URL missing')).toBeTruthy()
  })

  it('ignores repeated errors after fallback', async () => {
    render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    act(() => {
      lastWebViewProps?.onError?.({ nativeEvent: { description: 'Load failed' } })
    })

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
    })

    act(() => {
      lastWebViewProps?.onError?.({ nativeEvent: { description: 'Load failed again' } })
    })

    expect(lastWebViewProps?.source?.uri).toBe(mockLocalBundleUrl)
  })

  it('shows debug badge for dev builds', async () => {
    const { getByText } = render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    expect(getByText('remote')).toBeTruthy()
    sendReady()
  })

  it('hides debug badge for non-dev builds', async () => {
    mockExpoConfig.extra = {
      appVariant: 'prod',
      editorWebViewUrl: 'http://example.dev/editor-webview',
    }

    const { queryByText } = render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    expect(queryByText('remote')).toBeNull()
  })

  it('toggles the debug panel when the badge is pressed', async () => {
    const { getByText, queryByText } = render(<EditorWebView initialContent="" />)

    await waitFor(() => {
      expect(lastWebViewProps?.source?.uri).toBe('http://example.dev/editor-webview')
    })

    const badge = getByText('remote')
    expect(queryByText('WebView Debug')).toBeNull()

    fireEvent.press(badge)
    expect(getByText('WebView Debug')).toBeTruthy()

    fireEvent.press(badge)
    expect(queryByText('WebView Debug')).toBeNull()

    sendReady()
  })
})
