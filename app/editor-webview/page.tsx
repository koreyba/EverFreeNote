'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import RichTextEditorWebView, { type RichTextEditorWebViewHandle } from '@/ui/web/components/RichTextEditorWebView'
import { consumeChunkedMessage, sendChunkedText, type ChunkBufferStore } from '@core/utils/editorWebViewBridge'
import { NoteClipboardService } from '@core/services/noteClipboard'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

function parseNativeEventData(event: MessageEvent): string | null {
  if (typeof event.data === 'string') return event.data
  const nativeData = (event as unknown as { nativeEvent?: { data?: unknown } }).nativeEvent?.data
  return typeof nativeData === 'string' ? String(nativeData) : null
}

function sendTextToNative(type: string, text: string) {
  if (!window.ReactNativeWebView) return
  sendChunkedText(
    (message) => window.ReactNativeWebView?.postMessage(JSON.stringify(message)),
    type,
    text
  )
}

export default function EditorWebViewPage() {
  const [initialContent, setInitialContent] = useState('')
  const editorRef = React.useRef<RichTextEditorWebViewHandle>(null)
  const lastKnownHtmlRef = React.useRef<string | null>(null)
  const lastHistoryStateRef = React.useRef<{ canUndo: boolean; canRedo: boolean } | null>(null)
  const pendingBaselineRef = React.useRef(false)
  const pendingChunkFocusRef = React.useRef<{ charOffset: number; chunkLength: number } | null>(null)
  const chunkBuffers = React.useRef<ChunkBufferStore>(new Map())

  const handleHistoryStateChange = React.useCallback((state: { canUndo: boolean; canRedo: boolean }) => {
    const prev = lastHistoryStateRef.current
    if (prev?.canUndo === state.canUndo && prev?.canRedo === state.canRedo) {
      return
    }
    lastHistoryStateRef.current = state
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'HISTORY_STATE', payload: state }))
  }, [])

  useEffect(() => {
    const getMobileConfig = () => {
      const cfg = (window as unknown as { __EVERFREENOTE_MOBILE__?: { devHost?: string | null; supabaseUrl?: string | null; theme?: string | null } }).__EVERFREENOTE_MOBILE__
      return {
        devHost: cfg?.devHost ?? null,
        supabaseUrl: cfg?.supabaseUrl ?? null,
        theme: cfg?.theme ?? null,
      }
    }

    const applyTheme = (theme: string | null) => {
      if (theme !== 'dark' && theme !== 'light') return

      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      try {
        localStorage.setItem('everfreenote-theme', theme)
      } catch {
        // Ignore storage errors in restricted contexts.
      }
    }

    const normalizeOrigin = (url: string | null) => {
      if (!url) return null
      try {
        return new URL(url).origin
      } catch {
        return null
      }
    }

    const rewriteHtmlImageSources = (html: string) => {
      const { devHost, supabaseUrl } = getMobileConfig()
      const supabaseOrigin = normalizeOrigin(supabaseUrl)
      if (!devHost && !supabaseOrigin) return html

      const container = document.createElement('div')
      container.innerHTML = DOMPurify.sanitize(html)

      const imgs = Array.from(container.querySelectorAll('img'))
      for (const img of imgs) {
        const src = img.getAttribute('src')
        if (!src) continue

        if (supabaseOrigin && src.startsWith('/storage/v1/')) {
          img.setAttribute('src', `${supabaseOrigin}${src}`)
          continue
        }

        try {
          const url = new URL(src)
          if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname) && devHost) {
            url.hostname = devHost
            img.setAttribute('src', url.toString())
            continue
          }
        } catch {
          // Not an absolute URL; leave as-is.
        }
      }

      return container.innerHTML
    }

    const applySetContent = (html: string) => {
      const rewritten = rewriteHtmlImageSources(html)
      if (editorRef.current) {
        editorRef.current.setContent(rewritten)
        lastKnownHtmlRef.current = editorRef.current.getHTML()
      } else {
        setInitialContent(rewritten)
        pendingBaselineRef.current = true
        lastKnownHtmlRef.current = rewritten
      }
    }

    const { theme } = getMobileConfig()
    if (theme) {
      applyTheme(theme)
    }

    const isTrustedOrigin = (origin: string) => {
      if (!origin || origin === 'null' || origin === 'file://') return true
      if (origin === globalThis.location.origin) return true
      return false
    }

    const handleCommandNativeEvent = (payload: unknown) => {
      if (!editorRef.current) return
      const { method, args = [] } = (payload ?? {}) as { method?: string; args?: unknown[] }
      if (typeof method === 'string') {
        editorRef.current.runCommand(method, ...(Array.isArray(args) ? args : []))
      }
    }

    const handleScrollToChunkNativeEvent = (payload: unknown) => {
      const { charOffset, chunkLength } = (payload ?? {}) as { charOffset?: unknown; chunkLength?: unknown }
      if (typeof charOffset !== 'number' || typeof chunkLength !== 'number') return
      if (editorRef.current) {
        editorRef.current.scrollToChunk(charOffset, chunkLength)
      } else {
        pendingChunkFocusRef.current = { charOffset, chunkLength }
      }
    }

    const handleNativeEventPayload = (type: string, payload: unknown) => {
      const chunked = consumeChunkedMessage(type, payload, chunkBuffers.current)
      if (chunked?.baseType === 'SET_CONTENT') {
        applySetContent(chunked.text)
        return
      }

      switch (type) {
        case 'SET_CONTENT':
          applySetContent(typeof payload === 'string' ? payload : '')
          break
        case 'SET_THEME':
          applyTheme(typeof payload === 'string' ? payload : '')
          break
        case 'GET_CONTENT':
          if (editorRef.current) sendTextToNative('CONTENT_RESPONSE', editorRef.current.getHTML())
          break
        case 'REQUEST_COPY_PAYLOAD':
          if (editorRef.current) {
            const copyPayload = NoteClipboardService.buildPayload(editorRef.current.getHTML())
            sendTextToNative('COPY_PAYLOAD', JSON.stringify(copyPayload))
          }
          break
        case 'COMMAND':
          handleCommandNativeEvent(payload)
          break
        case 'SCROLL_TO_CHUNK':
          handleScrollToChunkNativeEvent(payload)
          break
      }
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.origin && !isTrustedOrigin(event.origin)) return

        const raw = parseNativeEventData(event)
        if (!raw) return

        const { type, payload } = JSON.parse(raw) as { type?: string; payload?: unknown }
        if (!type) return

        handleNativeEventPayload(type, payload)
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }

    window.addEventListener('message', handleMessage)
    // Android WebView historically dispatches messages on `document` instead of `window`.
    document.addEventListener('message', handleMessage as unknown as EventListener)

    // Surface broken image URLs to native for debugging.
    // This helps catch cases like `localhost` URLs in stored note HTML.
    let reported = 0
    const maxReports = 5
    const onErrorCapture = (event: Event) => {
      if (!window.ReactNativeWebView) return
      if (reported >= maxReports) return

      const target = event.target
      if (!(target instanceof HTMLImageElement)) return

      const src = target.currentSrc || target.src || target.getAttribute('src') || ''
      if (!src) return

      reported += 1
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'IMAGE_ERROR',
        payload: { src, message: 'img error' },
      }))
    }

    window.addEventListener('error', onErrorCapture, true)

    // Notify React Native that page is ready (after fonts load)
    const notifyReady = () => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }))
      }
    }

    // Wait for fonts to load to prevent FOUT (Flash of Unstyled Text)
    if (document.fonts?.ready) {
      document.fonts.ready.then(notifyReady).catch(notifyReady)
    } else {
      notifyReady()
    }

    return () => {
      window.removeEventListener('message', handleMessage)
      document.removeEventListener('message', handleMessage as unknown as EventListener)
      window.removeEventListener('error', onErrorCapture, true)
    }
  }, [])

  useEffect(() => {
    if (!pendingBaselineRef.current) return
    if (!editorRef.current) return
    lastKnownHtmlRef.current = editorRef.current.getHTML()
    pendingBaselineRef.current = false
  })

  useEffect(() => {
    if (!pendingChunkFocusRef.current) return
    if (!editorRef.current) return
    editorRef.current.scrollToChunk(
      pendingChunkFocusRef.current.charOffset,
      pendingChunkFocusRef.current.chunkLength
    )
    pendingChunkFocusRef.current = null
  })

  const handleChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.getHTML()
      if (html === lastKnownHtmlRef.current) return
      lastKnownHtmlRef.current = html
      // Send full content for autosave support (chunked if large)
      if (window.ReactNativeWebView) {
        sendChunkedText(
          (message) => window.ReactNativeWebView?.postMessage(JSON.stringify(message)),
          'CONTENT_CHANGED',
          html
        )
      }
    }
  }

  const handleFocus = () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EDITOR_FOCUS' }))
    }
  }

  const handleBlur = () => {
    if (window.ReactNativeWebView) {
      // Safety net: send content on blur to ensure nothing is lost
      if (editorRef.current) {
        const html = editorRef.current.getHTML()
        if (html !== lastKnownHtmlRef.current) {
          lastKnownHtmlRef.current = html
          sendChunkedText(
            (message) => window.ReactNativeWebView?.postMessage(JSON.stringify(message)),
            'CONTENT_ON_BLUR',
            html
          )
        }
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EDITOR_BLUR' }))
    }
  }

  const handleSelectionChange = (hasSelection: boolean) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECTION_CHANGE', payload: hasSelection }))
    }
  }

  return (
    <div className="h-screen w-screen overflow-auto bg-background">
      <RichTextEditorWebView
        ref={editorRef}
        initialContent={initialContent}
        onContentChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSelectionChange={handleSelectionChange}
        onHistoryStateChange={handleHistoryStateChange}
      />
    </div>
  )
}
