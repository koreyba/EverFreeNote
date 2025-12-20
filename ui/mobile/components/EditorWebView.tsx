import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import Constants from 'expo-constants'

export type EditorWebViewHandle = {
    setContent: (html: string) => void
    getContent: () => Promise<string>
    runCommand: (method: string, args?: unknown[]) => void
}

type Props = {
    initialContent?: string
    onContentChange?: (html: string) => void
    onReady?: () => void
}

const EditorWebView = forwardRef<EditorWebViewHandle, Props>(
    ({ initialContent = '', onContentChange, onReady }, ref) => {
        const webViewRef = useRef<WebView>(null)
        const [isReady, setIsReady] = useState(false)
        const pendingContent = useRef<string | null>(initialContent)
        const contentResolver = useRef<((html: string) => void) | null>(null)

        useImperativeHandle(ref, () => ({
            setContent(html: string) {
                if (isReady) {
                    webViewRef.current?.postMessage(
                        JSON.stringify({ type: 'SET_CONTENT', payload: html })
                    )
                } else {
                    pendingContent.current = html
                }
            },
            runCommand(method: string, args: unknown[] = []) {
                webViewRef.current?.postMessage(
                    JSON.stringify({ type: 'COMMAND', payload: { method, args } })
                )
            },
            async getContent() {
                return new Promise<string>((resolve) => {
                    contentResolver.current = resolve
                    webViewRef.current?.postMessage(
                        JSON.stringify({ type: 'GET_CONTENT' })
                    )
                    // Add timeout just in case
                    setTimeout(() => {
                        if (contentResolver.current === resolve) {
                            resolve('')
                            contentResolver.current = null
                        }
                    }, 2000)
                })
            },
        }))

        const handleMessage = (event: WebViewMessageEvent) => {
            try {
                const { type, payload } = JSON.parse(event.nativeEvent.data)

                switch (type) {
                    case 'READY':
                        setIsReady(true)
                        onReady?.()
                        if (pendingContent.current !== null) {
                            webViewRef.current?.postMessage(
                                JSON.stringify({ type: 'SET_CONTENT', payload: pendingContent.current })
                            )
                            pendingContent.current = null
                        }
                        break
                    case 'CONTENT_CHANGED':
                        onContentChange?.(payload)
                        break
                    case 'CONTENT_RESPONSE':
                        if (contentResolver.current) {
                            contentResolver.current(payload)
                            contentResolver.current = null
                        }
                        break
                }
            } catch (error) {
                console.error('[EditorWebView] Failed to parse message:', error)
            }
        }

        const editorUrl = __DEV__
            ? `http://${Constants.expoConfig?.hostUri?.split(':').shift()}:3000/editor-webview`
            : 'https://everfreenote.app/editor-webview'

        return (
            <View style={styles.container}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: editorUrl }}
                    onMessage={handleMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    style={styles.webview}
                />
                {!isReady && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4285F4" />
                    </View>
                )}
            </View>
        )
    }
)

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
})

EditorWebView.displayName = 'EditorWebView'

export default EditorWebView
