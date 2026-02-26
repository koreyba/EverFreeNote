'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import RichTextEditorWebView, { type RichTextEditorWebViewHandle } from '@/ui/web/components/RichTextEditorWebView'
import { consumeChunkedMessage, sendChunkedText, type ChunkBufferStore } from '@core/utils/editorWebViewBridge'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

export default function EditorWebViewPage() {
  const [initialContent, setInitialContent] = useState('')
  const editorRef = React.useRef<RichTextEditorWebViewHandle>(null)
  const lastKnownHtmlRef = React.useRef<string | null>(null)
  const lastHistoryStateRef = React.useRef<{ canUndo: boolean; canRedo: boolean } | null>(null)
  const pendingBaselineRef = React.useRef(false)
  const chunkBuffers = React.useRef<ChunkBufferStore>({})

  const handleHistoryStateChange = React.useCallback((state: { canUndo: boolean; canRedo: boolean }) => {
    const prev = lastHistoryStateRef.current
    if (prev && prev.canUndo === state.canUndo && prev.canRedo === state.canRedo) {
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
      container.innerHTML = html

      const imgs = Array.from(container.querySelectorAll('img'))
      for (const img of imgs) {
        const src = img.getAttribute('src')
        if (!src) continue

        // 1) Make relative Supabase Storage URLs absolute (common after ENEX conversions / sanitization)
        if (supabaseOrigin && src.startsWith('/storage/v1/')) {
          img.setAttribute('src', `${supabaseOrigin}${src}`)
          continue
        }

        // 2) Replace localhost/127.0.0.1 URLs with the dev machine host (phone can't reach its own localhost)
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

    const sendTextToNative = (type: string, text: string) => {
      if (!window.ReactNativeWebView) return
      sendChunkedText(
        (message) => window.ReactNativeWebView?.postMessage(JSON.stringify(message)),
        type,
        text
      )
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

    // Listen for messages from React Native
    const handleMessage = (event: MessageEvent) => {
      try {
        const raw =
          typeof event.data === 'string'
            ? event.data
            : typeof (event as unknown as { nativeEvent?: { data?: unknown } }).nativeEvent?.data ===
                'string'
              ? String((event as unknown as { nativeEvent?: { data?: unknown } }).nativeEvent?.data)
              : null

        if (!raw) return

        const { type, payload } = JSON.parse(raw) as { type?: string; payload?: unknown }
        if (!type) return

        const chunked = consumeChunkedMessage(type, payload, chunkBuffers.current)
        if (chunked?.baseType === 'SET_CONTENT') {
          applySetContent(chunked.text)
          return
        }

        if (type === 'SET_CONTENT') {
          applySetContent(String(payload ?? ''))
        } else if (type === 'SET_THEME') {
          applyTheme(String(payload ?? ''))
        } else if (type === 'GET_CONTENT') {
          if (editorRef.current) {
            sendTextToNative('CONTENT_RESPONSE', editorRef.current.getHTML())
          }
        } else if (type === 'COMMAND') {
          if (editorRef.current) {
            const { method, args = [] } = payload as { method?: string; args?: unknown[] }
            if (typeof method === 'string') {
              editorRef.current.runCommand(method, ...(Array.isArray(args) ? args : []))
            }
          }
        }
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
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(notifyReady).catch(notifyReady)
    } else {
      // Fallback for browsers without FontFaceSet API
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
