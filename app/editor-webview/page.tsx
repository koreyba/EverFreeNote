'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import RichTextEditor, { type RichTextEditorHandle } from '@/ui/web/components/RichTextEditor'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

export default function EditorWebViewPage() {
  const [initialContent, setInitialContent] = useState('')
  const editorRef = React.useRef<RichTextEditorHandle>(null)
  const suppressNextChange = React.useRef(false)
  const chunkBuffers = React.useRef<Record<string, { baseType: string; total: number; chunks: string[] }>>({})

  useEffect(() => {
    const sendTextToNative = (type: string, text: string) => {
      if (!window.ReactNativeWebView) return

      const chunkSize = 30_000
      if (text.length <= chunkSize) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload: text }))
        return
      }

      const transferId = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
      const total = Math.ceil(text.length / chunkSize)
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: `${type}_CHUNK_START`, payload: { transferId, total } })
      )
      for (let index = 0; index < total; index++) {
        const start = index * chunkSize
        const chunk = text.slice(start, start + chunkSize)
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: `${type}_CHUNK`, payload: { transferId, index, chunk } })
        )
      }
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: `${type}_CHUNK_END`, payload: { transferId } })
      )
    }

    const applySetContent = (html: string) => {
      suppressNextChange.current = true
      if (editorRef.current) {
        editorRef.current.setContent(html)
      } else {
        setInitialContent(html)
      }
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

        if (type === 'SET_CONTENT') {
          applySetContent(String(payload ?? ''))
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
        } else if (type === 'SET_CONTENT_CHUNK_START') {
          const p = payload as { transferId?: string; total?: number }
          if (!p.transferId || typeof p.total !== 'number') return
          chunkBuffers.current[p.transferId] = { baseType: 'SET_CONTENT', total: p.total, chunks: [] }
        } else if (type === 'SET_CONTENT_CHUNK') {
          const p = payload as { transferId?: string; index?: number; chunk?: string }
          if (!p.transferId || typeof p.index !== 'number' || typeof p.chunk !== 'string') return
          const entry = chunkBuffers.current[p.transferId]
          if (!entry) return
          entry.chunks[p.index] = p.chunk
        } else if (type === 'SET_CONTENT_CHUNK_END') {
          const p = payload as { transferId?: string }
          if (!p.transferId) return
          const entry = chunkBuffers.current[p.transferId]
          if (!entry) return
          const html = entry.chunks.join('')
          delete chunkBuffers.current[p.transferId]
          applySetContent(html)
        }
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }

    window.addEventListener('message', handleMessage)
    // Android WebView historically dispatches messages on `document` instead of `window`.
    document.addEventListener('message', handleMessage as unknown as EventListener)

    // Notify React Native that page is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }))
    }

    return () => {
      window.removeEventListener('message', handleMessage)
      document.removeEventListener('message', handleMessage as unknown as EventListener)
    }
  }, [])

  const handleChange = () => {
    if (suppressNextChange.current) {
      suppressNextChange.current = false
      return
    }
    if (editorRef.current) {
      const html = editorRef.current.getHTML()
      // Send full content for autosave support (chunked if large)
      if (window.ReactNativeWebView) {
        const chunkSize = 30_000
        if (html.length <= chunkSize) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONTENT_CHANGED', payload: html }))
        } else {
          const transferId = `CONTENT_CHANGED_${Date.now()}_${Math.random().toString(16).slice(2)}`
          const total = Math.ceil(html.length / chunkSize)
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'CONTENT_CHANGED_CHUNK_START', payload: { transferId, total } })
          )
          for (let index = 0; index < total; index++) {
            const start = index * chunkSize
            const chunk = html.slice(start, start + chunkSize)
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'CONTENT_CHANGED_CHUNK', payload: { transferId, index, chunk } })
            )
          }
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'CONTENT_CHANGED_CHUNK_END', payload: { transferId } })
          )
        }
      }
    }
  }

  return (
    <div className="h-screen w-screen overflow-auto bg-background">
      <RichTextEditor
        ref={editorRef}
        initialContent={initialContent}
        onContentChange={handleChange}
        hideToolbar={true}
      />
    </div>
  )
}
