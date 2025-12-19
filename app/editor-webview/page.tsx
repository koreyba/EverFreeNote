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

  useEffect(() => {
    // Listen for messages from React Native
    const handleMessage = (event: MessageEvent) => {
      try {
        const { type, payload } = JSON.parse(event.data)

        if (type === 'SET_CONTENT') {
          if (editorRef.current) {
            editorRef.current.setContent(payload)
          } else {
            setInitialContent(payload)
          }
        } else if (type === 'GET_CONTENT') {
          if (window.ReactNativeWebView && editorRef.current) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'CONTENT_RESPONSE',
                payload: editorRef.current.getHTML()
              })
            )
          }
        } else if (type === 'COMMAND') {
          if (editorRef.current) {
            const { method, args = [] } = payload
            editorRef.current.runCommand(method, ...args)
          }
        }
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }

    window.addEventListener('message', handleMessage)

    // Notify React Native that page is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'READY' })
      )
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleChange = () => {
    if (window.ReactNativeWebView && editorRef.current) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'CONTENT_CHANGED',
          payload: editorRef.current.getHTML() // Also send content on every change for auto-save support
        })
      )
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <RichTextEditor
        ref={editorRef}
        initialContent={initialContent}
        onContentChange={handleChange}
        hideToolbar={true}
      />
    </div>
  )
}
