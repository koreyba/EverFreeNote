/**
 * Tests for EditorWebView message handling
 * Specifically tests CONTENT_ON_BLUR safety net feature
 */
import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'

// Mock WebView
const mockPostMessage = jest.fn()
let capturedOnMessage: ((event: { nativeEvent: { data: string } }) => void) | null = null

jest.mock('react-native-webview', () => {
  const React = require('react')

  return {
    WebView: React.forwardRef((props: { onMessage?: (event: { nativeEvent: { data: string } }) => void }, ref: unknown) => {
      capturedOnMessage = props.onMessage ?? null

      React.useImperativeHandle(ref, () => ({
        postMessage: mockPostMessage,
      }))

      const { View, Text } = require('react-native')
      return (
        <View testID="webview">
          <Text>WebView</Text>
        </View>
      )
    }),
  }
})

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
    hostUri: 'localhost:8081',
  },
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
    },
    colorScheme: 'light',
  }),
}))

import EditorWebView from '@ui/mobile/components/EditorWebView'

describe('EditorWebView message handling', () => {
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnMessage = null
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  const sendMessage = (type: string, payload?: unknown) => {
    act(() => {
      capturedOnMessage?.({
        nativeEvent: { data: JSON.stringify({ type, payload }) },
      })
    })
  }

  describe('CONTENT_ON_BLUR handling', () => {
    it('calls onContentChange when CONTENT_ON_BLUR message is received', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      // Wait for WebView to be ready
      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      // Simulate CONTENT_ON_BLUR message from WebView
      sendMessage('CONTENT_ON_BLUR', '<p>Pasted content that was saved on blur</p>')

      expect(onContentChange).toHaveBeenCalledWith('<p>Pasted content that was saved on blur</p>')
    })

    it('handles empty CONTENT_ON_BLUR payload gracefully', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('CONTENT_ON_BLUR', '')

      expect(onContentChange).toHaveBeenCalledWith('')
    })

    it('handles null CONTENT_ON_BLUR payload gracefully', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('CONTENT_ON_BLUR', null)

      expect(onContentChange).toHaveBeenCalledWith('')
    })
  })

  describe('CONTENT_ON_BLUR chunked transfer', () => {
    it('reassembles chunked content and calls onContentChange', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      const transferId = 'test-transfer-123'
      const chunk1 = '<p>First chunk'
      const chunk2 = ' of content</p>'

      // Send chunked transfer
      sendMessage('CONTENT_ON_BLUR_CHUNK_START', { transferId, total: 2 })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 0, chunk: chunk1 })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 1, chunk: chunk2 })
      sendMessage('CONTENT_ON_BLUR_CHUNK_END', { transferId })

      expect(onContentChange).toHaveBeenCalledWith('<p>First chunk of content</p>')
    })

    it('ignores incomplete chunked transfer', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      const transferId = 'incomplete-transfer'

      // Start transfer but don't finish
      sendMessage('CONTENT_ON_BLUR_CHUNK_START', { transferId, total: 2 })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 0, chunk: 'partial' })
      // Missing chunk 1 and CHUNK_END

      // onContentChange should not be called for incomplete transfer
      expect(onContentChange).not.toHaveBeenCalled()
    })

    it('handles out-of-order chunks correctly', async () => {
      const onContentChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      const transferId = 'out-of-order-transfer'

      // Send chunks out of order
      sendMessage('CONTENT_ON_BLUR_CHUNK_START', { transferId, total: 3 })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 2, chunk: 'third' })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 0, chunk: 'first' })
      sendMessage('CONTENT_ON_BLUR_CHUNK', { transferId, index: 1, chunk: 'second' })
      sendMessage('CONTENT_ON_BLUR_CHUNK_END', { transferId })

      // Should reassemble in correct order
      expect(onContentChange).toHaveBeenCalledWith('firstsecondthird')
    })
  })

  describe('SELECTION_CHANGE handling', () => {
    it('calls onSelectionChange(true) when payload is true', async () => {
      const onSelectionChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onSelectionChange={onSelectionChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('SELECTION_CHANGE', true)

      expect(onSelectionChange).toHaveBeenCalledWith(true)
    })

    it('calls onSelectionChange(false) when payload is false', async () => {
      const onSelectionChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onSelectionChange={onSelectionChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('SELECTION_CHANGE', false)

      expect(onSelectionChange).toHaveBeenCalledWith(false)
    })

    it('does not throw when onSelectionChange is not provided', async () => {
      render(<EditorWebView initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      expect(() => sendMessage('SELECTION_CHANGE', true)).not.toThrow()
    })
  })

  describe('scrollToChunk bridge', () => {
    it('queues chunk focus until the editor signals READY', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      act(() => {
        ref.current?.scrollToChunk(24, 7)
      })

      expect(mockPostMessage).not.toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SCROLL_TO_CHUNK',
          payload: { charOffset: 24, chunkLength: 7 },
        })
      )

      sendMessage('READY')

      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'SCROLL_TO_CHUNK',
            payload: { charOffset: 24, chunkLength: 7 },
          })
        )
      })
    })

    it('sends chunk focus immediately after the editor is ready', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('READY')
      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'SET_THEME',
            payload: 'light',
          })
        )
      })

      act(() => {
        mockPostMessage.mockClear()
        ref.current?.scrollToChunk(120, 18)
      })

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SCROLL_TO_CHUNK',
          payload: { charOffset: 120, chunkLength: 18 },
        })
      )
    })
  })

  describe('imperative bridge methods', () => {
    it('queues setContent before READY and flushes it once the editor is ready', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      act(() => {
        ref.current?.setContent('<p>Queued content</p>')
      })

      expect(mockPostMessage).not.toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SET_CONTENT',
          payload: '<p>Queued content</p>',
        })
      )

      sendMessage('READY')

      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'SET_CONTENT',
            payload: '<p>Queued content</p>',
          })
        )
      })
    })

    it('flushes queued content before queued chunk focus on READY', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      act(() => {
        ref.current?.setContent('<p>Queued content</p>')
        ref.current?.scrollToChunk(24, 7)
      })

      sendMessage('READY')

      await waitFor(() => {
        const messages = mockPostMessage.mock.calls.map(([value]) => JSON.parse(String(value)) as { type: string })
        const setContentIndex = messages.findIndex((message) => message.type === 'SET_CONTENT')
        const scrollIndex = messages.findIndex((message) => message.type === 'SCROLL_TO_CHUNK')

        expect(setContentIndex).toBeGreaterThanOrEqual(0)
        expect(scrollIndex).toBeGreaterThan(setContentIndex)
      })
    })

    it('posts COMMAND messages immediately through runCommand', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      act(() => {
        ref.current?.runCommand('toggleBold', ['arg-1'])
      })

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'COMMAND',
          payload: {
            method: 'toggleBold',
            args: ['arg-1'],
          },
        })
      )
    })

    it('requests content and resolves the promise from CONTENT_RESPONSE', async () => {
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      const contentPromise = ref.current?.getContent()

      expect(mockPostMessage).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'GET_CONTENT',
        })
      )

      sendMessage('CONTENT_RESPONSE', '<p>Saved content</p>')

      await expect(contentPromise).resolves.toBe('<p>Saved content</p>')
    })

    it('resolves getContent with an empty string when the editor never responds', async () => {
      jest.useFakeTimers()
      const ref = React.createRef<React.ElementRef<typeof EditorWebView>>()

      render(<EditorWebView ref={ref} initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      try {
        const contentPromise = ref.current?.getContent()

        expect(mockPostMessage).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'GET_CONTENT',
          })
        )

        await act(async () => {
          jest.advanceTimersByTime(2000)
        })

        await expect(contentPromise).resolves.toBe('')
      } finally {
        jest.useRealTimers()
      }
    })
  })

  describe('HISTORY_STATE handling', () => {
    it('calls onHistoryStateChange with canUndo/canRedo from payload', async () => {
      const onHistoryStateChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onHistoryStateChange={onHistoryStateChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('HISTORY_STATE', { canUndo: true, canRedo: false })

      expect(onHistoryStateChange).toHaveBeenCalledWith({ canUndo: true, canRedo: false })
    })

    it('coerces missing HISTORY_STATE fields to false', async () => {
      const onHistoryStateChange = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onHistoryStateChange={onHistoryStateChange}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('HISTORY_STATE', null)

      expect(onHistoryStateChange).toHaveBeenCalledWith({ canUndo: false, canRedo: false })
    })

    it('does not throw when onHistoryStateChange is not provided', async () => {
      render(<EditorWebView initialContent="" />)

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      expect(() => sendMessage('HISTORY_STATE', { canUndo: true, canRedo: true })).not.toThrow()
    })
  })

  describe('EDITOR_BLUR handling', () => {
    it('calls onBlur when EDITOR_BLUR message is received', async () => {
      const onBlur = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onBlur={onBlur}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      sendMessage('EDITOR_BLUR')

      expect(onBlur).toHaveBeenCalled()
    })

    it('handles CONTENT_ON_BLUR followed by EDITOR_BLUR', async () => {
      const onContentChange = jest.fn()
      const onBlur = jest.fn()

      render(
        <EditorWebView
          initialContent=""
          onContentChange={onContentChange}
          onBlur={onBlur}
        />
      )

      await waitFor(() => {
        expect(capturedOnMessage).not.toBeNull()
      })

      // This is the expected sequence from page.tsx handleBlur
      sendMessage('CONTENT_ON_BLUR', '<p>Content saved on blur</p>')
      sendMessage('EDITOR_BLUR')

      expect(onContentChange).toHaveBeenCalledWith('<p>Content saved on blur</p>')
      expect(onBlur).toHaveBeenCalled()
    })
  })
})
