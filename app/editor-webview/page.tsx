'use client'

import RichTextEditor from '@/ui/web/components/RichTextEditor'
import { useEffect, useState } from 'react'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

export default function EditorWebViewPage() {
  const [content, setContent] = useState('')

  useEffect(() => {
    // Listen for messages from React Native
    const handleMessage = (event: MessageEvent) => {
      try {
        const { type, payload } = JSON.parse(event.data)

        if (type === 'SET_CONTENT') {
          setContent(payload)
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
    // onContentChange is triggered, but we need to get HTML from editor ref
    // For now, this is just a signal that content changed
    // The WebView will get content when needed via getHTML message
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'CONTENT_CHANGED' })
      )
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <RichTextEditor initialContent={content} onContentChange={handleChange} />
    </div>
  )
}
