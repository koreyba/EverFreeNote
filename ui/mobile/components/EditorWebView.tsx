import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import Constants from 'expo-constants'
import { getSupabaseConfig } from '@ui/mobile/adapters'
import { colors } from '@ui/mobile/lib/theme'

const chunkSizeChars = 30_000

type ChunkStartPayload = { transferId: string; total: number }
type ChunkPayload = { transferId: string; index: number; chunk: string }
type ChunkEndPayload = { transferId: string }

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
        const [loadError, setLoadError] = useState<string | null>(null)
        const pendingContent = useRef<string | null>(initialContent)
        const contentResolver = useRef<((html: string) => void) | null>(null)
        const pendingChunks = useRef<Record<string, { total: number; chunks: string[] }>>({})

        const post = (message: { type: string; payload?: unknown }) => {
            webViewRef.current?.postMessage(JSON.stringify(message))
        }

        const sendText = (type: string, text: string) => {
            if (text.length <= chunkSizeChars) {
                post({ type, payload: text })
                return
            }

            const transferId = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
            const total = Math.ceil(text.length / chunkSizeChars)
            post({ type: `${type}_CHUNK_START`, payload: { transferId, total } satisfies ChunkStartPayload })
            for (let index = 0; index < total; index++) {
                const start = index * chunkSizeChars
                const chunk = text.slice(start, start + chunkSizeChars)
                post({ type: `${type}_CHUNK`, payload: { transferId, index, chunk } satisfies ChunkPayload })
            }
            post({ type: `${type}_CHUNK_END`, payload: { transferId } satisfies ChunkEndPayload })
        }

        useImperativeHandle(ref, () => ({
            setContent(html: string) {
                if (isReady) {
                    sendText('SET_CONTENT', html)
                } else {
                    pendingContent.current = html
                }
            },
            runCommand(method: string, args: unknown[] = []) {
                post({ type: 'COMMAND', payload: { method, args } })
            },
            async getContent() {
                return new Promise<string>((resolve) => {
                    contentResolver.current = resolve
                    post({ type: 'GET_CONTENT' })
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

        const editorUrl = (() => {
            const configured = process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL?.trim()
            if (configured) return configured

            if (__DEV__) {
                const host = Constants.expoConfig?.hostUri?.split(':').shift()
                if (host && host.length > 0) return `http://${host}:3000/editor-webview`
                return 'http://localhost:3000/editor-webview'
            }

            return 'https://everfreenote.app/editor-webview'
        })()

        const injectedJavaScriptBeforeContentLoaded = (() => {
            const devHost = Constants.expoConfig?.hostUri?.split(':').shift() ?? null
            let supabaseUrl: string | null = null
            try {
                supabaseUrl = getSupabaseConfig().url
            } catch {
                supabaseUrl = null
            }

            return `
              window.__EVERFREENOTE_MOBILE__ = {
                devHost: ${JSON.stringify(devHost)},
                supabaseUrl: ${JSON.stringify(supabaseUrl)},
              };
              true;
            `
        })()

        const handleMessage = (event: WebViewMessageEvent) => {
            try {
                const { type, payload } = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: unknown }
                if (!type) return

                switch (type) {
                    case 'READY':
                        setIsReady(true)
                        onReady?.()
                        if (pendingContent.current !== null) {
                            sendText('SET_CONTENT', pendingContent.current)
                            pendingContent.current = null
                        }
                        break
                    case 'CONTENT_CHANGED':
                        onContentChange?.(String(payload ?? ''))
                        break
                    case 'CONTENT_RESPONSE':
                        if (contentResolver.current) {
                            contentResolver.current(String(payload ?? ''))
                            contentResolver.current = null
                        }
                        break
                    case 'CONTENT_CHANGED_CHUNK_START':
                    case 'CONTENT_RESPONSE_CHUNK_START': {
                        const p = payload as Partial<ChunkStartPayload>
                        if (!p.transferId || typeof p.total !== 'number') return
                        pendingChunks.current[p.transferId] = { total: p.total, chunks: [] }
                        break
                    }
                    case 'CONTENT_CHANGED_CHUNK':
                    case 'CONTENT_RESPONSE_CHUNK': {
                        const p = payload as Partial<ChunkPayload>
                        if (!p.transferId || typeof p.index !== 'number' || typeof p.chunk !== 'string') return
                        const entry = pendingChunks.current[p.transferId]
                        if (!entry) return
                        entry.chunks[p.index] = p.chunk
                        break
                    }
                    case 'CONTENT_CHANGED_CHUNK_END':
                    case 'CONTENT_RESPONSE_CHUNK_END': {
                        const p = payload as Partial<ChunkEndPayload>
                        if (!p.transferId) return
                        const entry = pendingChunks.current[p.transferId]
                        if (!entry) return

                        const text = entry.chunks.join('')
                        delete pendingChunks.current[p.transferId]

                        if (type === 'CONTENT_CHANGED_CHUNK_END') {
                            onContentChange?.(text)
                        } else if (type === 'CONTENT_RESPONSE_CHUNK_END') {
                            if (contentResolver.current) {
                                contentResolver.current(text)
                                contentResolver.current = null
                            }
                        }
                        break
                    }
                    case 'IMAGE_ERROR': {
                        const p = payload as { src?: unknown; message?: unknown }
                        console.error('[EditorWebView] Image failed to load:', p?.src, p?.message)
                        break
                    }
                }
            } catch (error) {
                console.error('[EditorWebView] Failed to parse message:', error)
            }
        }

        return (
            <View style={styles.container}>
                <WebView
                    ref={webViewRef}
                    source={{ uri: editorUrl }}
                    onMessage={handleMessage}
                    javaScriptEnabled
                    domStorageEnabled
                    style={styles.webview}
                    injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
                    mixedContentMode="always"
                    onLoadStart={() => {
                        setLoadError(null)
                    }}
                    onError={(syntheticEvent) => {
                        const description = syntheticEvent.nativeEvent.description
                        setLoadError(description || 'WebView failed to load editor page')
                    }}
                    onHttpError={(syntheticEvent) => {
                        const statusCode = syntheticEvent.nativeEvent.statusCode
                        const description = syntheticEvent.nativeEvent.description
                        setLoadError(`HTTP ${statusCode}: ${description || 'Failed to load editor page'}`)
                    }}
                />
                {!!loadError && (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.errorTitle}>Editor failed to load</Text>
                        <Text style={styles.errorSubtitle} numberOfLines={3}>
                            {loadError}
                        </Text>
                        <Text style={styles.errorUrl} numberOfLines={2}>
                            {editorUrl}
                        </Text>
                    </View>
                )}
                {!loadError && !isReady && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.light.primary} />
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
        backgroundColor: colors.light.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    errorTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: colors.light.destructive,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: colors.light.mutedForeground,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorUrl: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: colors.light.mutedForeground,
        textAlign: 'center',
    },
})

EditorWebView.displayName = 'EditorWebView'

export default EditorWebView
