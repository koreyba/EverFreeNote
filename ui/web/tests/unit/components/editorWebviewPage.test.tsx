/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { render, act } from '@testing-library/react'
import EditorWebViewPage from '@/app/editor-webview/page'
import type { RichTextEditorWebViewHandle } from '@/ui/web/components/RichTextEditorWebView'

const mockGetHTML = jest.fn(() => '<p>Initial Content</p>')
const mockSetContent = jest.fn()
const mockRunCommand = jest.fn()
const mockScrollToChunk = jest.fn()

let mockHandle: RichTextEditorWebViewHandle | null = {
  getHTML: mockGetHTML,
  setContent: mockSetContent,
  runCommand: mockRunCommand,
  scrollToChunk: mockScrollToChunk,
}

type MockEditorProps = {
  initialContent?: string
  onContentChange?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onSelectionChange?: (hasSelection: boolean) => void
  onHistoryStateChange?: (state: { canUndo: boolean; canRedo: boolean }) => void
}

let capturedEditorProps: MockEditorProps = {}

jest.mock('@/ui/web/components/RichTextEditorWebView', () => {
  const React = require('react')
  return React.forwardRef(function MockRichTextEditorWebView(
    props: MockEditorProps,
    ref: any
  ) {
    React.useEffect(() => {
      capturedEditorProps = props
    })
    React.useImperativeHandle(ref, () => mockHandle as RichTextEditorWebViewHandle)
    return (
      <div
        data-testid="rich-text-editor-webview"
        data-initial-content={props.initialContent}
      />
    )
  })
})

type MobileConfig = {
  devHost?: string | null
  supabaseUrl?: string | null
  theme?: string | null
}

type ExtendedWindow = Window & typeof globalThis & {
  ReactNativeWebView?: { postMessage: (message: string) => void }
  __EVERFREENOTE_MOBILE__?: MobileConfig
}

describe('EditorWebViewPage', () => {
  let originalReactNativeWebView: { postMessage: (message: string) => void } | undefined
  let originalMobileConfig: MobileConfig | undefined
  let postMessageMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    postMessageMock = jest.fn()
    mockHandle = {
      getHTML: mockGetHTML,
      setContent: mockSetContent,
      runCommand: mockRunCommand,
      scrollToChunk: mockScrollToChunk,
    }
    mockGetHTML.mockReturnValue('<p>Initial Content</p>')
    capturedEditorProps = {}

    const extWin = window as ExtendedWindow
    originalReactNativeWebView = extWin.ReactNativeWebView
    originalMobileConfig = extWin.__EVERFREENOTE_MOBILE__

    extWin.ReactNativeWebView = {
      postMessage: postMessageMock,
    }
    delete extWin.__EVERFREENOTE_MOBILE__
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    const extWin = window as ExtendedWindow
    if (originalReactNativeWebView !== undefined) {
      extWin.ReactNativeWebView = originalReactNativeWebView
    } else {
      delete extWin.ReactNativeWebView
    }

    if (originalMobileConfig !== undefined) {
      extWin.__EVERFREENOTE_MOBILE__ = originalMobileConfig
    } else {
      delete extWin.__EVERFREENOTE_MOBILE__
    }
  })

  it('renders RichTextEditorWebView and sends READY message to ReactNativeWebView on mount', async () => {
    const docWithFonts = document as unknown as { fonts?: { ready: Promise<void> } }
    const originalFonts = docWithFonts.fonts
    let resolveFontsReady: () => void = () => {}
    const fontsReadyPromise = new Promise<void>((resolve) => {
      resolveFontsReady = resolve
    })

    docWithFonts.fonts = { ready: fontsReadyPromise }

    render(<EditorWebViewPage />)

    expect(postMessageMock).not.toHaveBeenCalledWith(JSON.stringify({ type: 'READY' }))

    await act(async () => {
      resolveFontsReady()
      await fontsReadyPromise
    })

    expect(postMessageMock).toHaveBeenCalledWith(JSON.stringify({ type: 'READY' }))

    if (originalFonts !== undefined) {
      docWithFonts.fonts = originalFonts
    } else {
      delete docWithFonts.fonts
    }
  })

  it('sends READY immediately if document.fonts is not available', () => {
    const docWithFonts = document as unknown as { fonts?: { ready: Promise<void> } }
    const originalFonts = docWithFonts.fonts
    delete docWithFonts.fonts

    render(<EditorWebViewPage />)

    expect(postMessageMock).toHaveBeenCalledWith(JSON.stringify({ type: 'READY' }))

    if (originalFonts !== undefined) {
      docWithFonts.fonts = originalFonts
    }
  })

  it('applies theme dark/light from __EVERFREENOTE_MOBILE__ on mount', () => {
    const extWin = window as ExtendedWindow
    extWin.__EVERFREENOTE_MOBILE__ = { theme: 'dark' }
    render(<EditorWebViewPage />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    extWin.__EVERFREENOTE_MOBILE__ = { theme: 'light' }
    render(<EditorWebViewPage />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('handles SET_THEME message to toggle theme class and localStorage', () => {
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'SET_THEME', payload: 'dark' }),
        })
      )
    })
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'SET_THEME', payload: 'light' }),
        })
      )
    })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignores message if origin is untrusted', () => {
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://untrusted-domain.com',
          data: JSON.stringify({ type: 'SET_THEME', payload: 'dark' }),
        })
      )
    })

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('handles SET_CONTENT message and rewrites image sources', () => {
    const extWin = window as ExtendedWindow
    extWin.__EVERFREENOTE_MOBILE__ = {
      devHost: '192.168.1.100',
      supabaseUrl: 'https://test-project.supabase.co',
    }

    render(<EditorWebViewPage />)

    const rawHtml = '<p>Hello</p><img src="/storage/v1/object/public/notes/1.png" /><img src="http://localhost:3000/pic.jpg" />'

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'SET_CONTENT', payload: rawHtml }),
        })
      )
    })

    expect(mockSetContent).toHaveBeenCalled()
    const setHtml = mockSetContent.mock.calls[0][0] as string
    expect(setHtml).toContain('https://test-project.supabase.co/storage/v1/object/public/notes/1.png')
    expect(setHtml).toContain('http://192.168.1.100:3000/pic.jpg')
  })

  it('sets initial content when SET_CONTENT is received before editor ref is initialized', () => {
    mockHandle = null
    const { rerender } = render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'SET_CONTENT', payload: '<p>Pending Content</p>' }),
        })
      )
    })

    expect(mockSetContent).not.toHaveBeenCalled()

    mockHandle = {
      getHTML: mockGetHTML,
      setContent: mockSetContent,
      runCommand: mockRunCommand,
      scrollToChunk: mockScrollToChunk,
    }
    rerender(<EditorWebViewPage />)

    expect(capturedEditorProps.initialContent).toBe('<p>Pending Content</p>')
  })

  it('handles GET_CONTENT message by posting CONTENT_RESPONSE back to ReactNativeWebView', () => {
    mockGetHTML.mockReturnValue('<p>Current HTML</p>')
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'GET_CONTENT' }),
        })
      )
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      JSON.stringify({ type: 'CONTENT_RESPONSE', payload: '<p>Current HTML</p>' })
    )
  })

  it('handles REQUEST_COPY_PAYLOAD message by sending COPY_PAYLOAD to ReactNativeWebView', () => {
    mockGetHTML.mockReturnValue('<p>Copied text</p>')
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'REQUEST_COPY_PAYLOAD' }),
        })
      )
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('"type":"COPY_PAYLOAD"')
    )
  })

  it('handles COMMAND message by calling editorRef.runCommand', () => {
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'COMMAND',
            payload: { method: 'toggleBold', args: ['extraArg'] },
          }),
        })
      )
    })

    expect(mockRunCommand).toHaveBeenCalledWith('toggleBold', 'extraArg')
  })

  it('handles SCROLL_TO_CHUNK message', () => {
    render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'SCROLL_TO_CHUNK',
            payload: { charOffset: 120, chunkLength: 15 },
          }),
        })
      )
    })

    expect(mockScrollToChunk).toHaveBeenCalledWith(120, 15)
  })

  it('handles SCROLL_TO_CHUNK received before editor ref ready and executes on effect', () => {
    mockHandle = null
    const { rerender } = render(<EditorWebViewPage />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'SCROLL_TO_CHUNK',
            payload: { charOffset: 50, chunkLength: 20 },
          }),
        })
      )
    })

    expect(mockScrollToChunk).not.toHaveBeenCalled()

    mockHandle = {
      getHTML: mockGetHTML,
      setContent: mockSetContent,
      runCommand: mockRunCommand,
      scrollToChunk: mockScrollToChunk,
    }
    rerender(<EditorWebViewPage />)

    expect(mockScrollToChunk).toHaveBeenCalledWith(50, 20)
  })

  it('handles chunked SET_CONTENT messages', () => {
    render(<EditorWebViewPage />)

    const transferId = 'transfer_123'
    const fullText = '<p>Large Chunked Content</p>'

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'SET_CONTENT_CHUNK_START',
            payload: { transferId, total: 1 },
          }),
        })
      )
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'SET_CONTENT_CHUNK',
            payload: { transferId, index: 0, chunk: fullText },
          }),
        })
      )
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'SET_CONTENT_CHUNK_END',
            payload: { transferId },
          }),
        })
      )
    })

    expect(mockSetContent).toHaveBeenCalledWith(fullText)
  })

  it('handles history state changes and deduplicates identical states', () => {
    render(<EditorWebViewPage />)

    act(() => {
      capturedEditorProps.onHistoryStateChange?.({ canUndo: true, canRedo: false })
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      JSON.stringify({ type: 'HISTORY_STATE', payload: { canUndo: true, canRedo: false } })
    )

    postMessageMock.mockClear()

    act(() => {
      capturedEditorProps.onHistoryStateChange?.({ canUndo: true, canRedo: false })
    })

    expect(postMessageMock).not.toHaveBeenCalled()
  })

  it('handles editor focus, selection change, and blur events', () => {
    mockGetHTML.mockReturnValue('<p>New HTML on Blur</p>')
    render(<EditorWebViewPage />)

    act(() => {
      capturedEditorProps.onFocus?.()
    })
    expect(postMessageMock).toHaveBeenCalledWith(JSON.stringify({ type: 'EDITOR_FOCUS' }))

    act(() => {
      capturedEditorProps.onSelectionChange?.(true)
    })
    expect(postMessageMock).toHaveBeenCalledWith(
      JSON.stringify({ type: 'SELECTION_CHANGE', payload: true })
    )

    postMessageMock.mockClear()

    act(() => {
      capturedEditorProps.onBlur?.()
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('"type":"CONTENT_ON_BLUR"')
    )
    expect(postMessageMock).toHaveBeenCalledWith(JSON.stringify({ type: 'EDITOR_BLUR' }))
  })

  it('handles content change event and sends CONTENT_CHANGED message', () => {
    mockGetHTML.mockReturnValue('<p>Changed content</p>')
    render(<EditorWebViewPage />)

    postMessageMock.mockClear()

    act(() => {
      capturedEditorProps.onContentChange?.()
    })

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.stringContaining('"type":"CONTENT_CHANGED"')
    )
  })

  it('handles image error capture and limits to 5 reports', () => {
    render(<EditorWebViewPage />)

    postMessageMock.mockClear()

    for (let i = 0; i < 7; i++) {
      const img = document.createElement('img')
      img.src = `http://localhost/broken-${i}.png`
      const errorEvent = new Event('error', { bubbles: true })
      Object.defineProperty(errorEvent, 'target', { value: img, enumerable: true })

      act(() => {
        window.dispatchEvent(errorEvent)
      })
    }

    const imageErrorCalls = postMessageMock.mock.calls.filter((call: [string]) =>
      call[0].includes('IMAGE_ERROR')
    )
    expect(imageErrorCalls.length).toBe(5)
  })

  it('parses nativeEvent.data when event.data is not a string', () => {
    render(<EditorWebViewPage />)

    act(() => {
      const customEvent = new Event('message')
      Object.defineProperty(customEvent, 'nativeEvent', {
        value: { data: JSON.stringify({ type: 'SET_THEME', payload: 'dark' }) },
      })
      window.dispatchEvent(customEvent)
    })

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
