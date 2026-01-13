import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import Constants from 'expo-constants'
import NetInfo from '@react-native-community/netinfo'
import { getSupabaseConfig } from '@ui/mobile/adapters'
import { useTheme } from '@ui/mobile/providers'
import { consumeChunkedMessage, sendChunkedText, type ChunkBufferStore } from '@core/utils/editorWebViewBridge'
import { getLocalBundleUrl } from '@ui/mobile/utils/localBundle'

export type EditorWebViewHandle = {
    setContent: (html: string) => void
    getContent: () => Promise<string>
    runCommand: (method: string, args?: unknown[]) => void
}

type Props = {
    initialContent?: string
    onContentChange?: (html: string) => void
    onReady?: () => void
    onFocus?: () => void
    onBlur?: () => void
    loadingFallback?: React.ReactNode
}

const EditorWebView = forwardRef<EditorWebViewHandle, Props>(
    ({ initialContent = '', onContentChange, onReady, onFocus, onBlur, loadingFallback }, ref) => {
        const webViewRef = useRef<WebView>(null)
        const { colors, colorScheme } = useTheme()
        const styles = useMemo(() => createStyles(colors), [colors])
        const [isReady, setIsReady] = useState(false)
        const [loadError, setLoadError] = useState<string | null>(null)
        const [isConnected, setIsConnected] = useState(true)
        const pendingContent = useRef<string | null>(initialContent)
        const contentResolver = useRef<((html: string) => void) | null>(null)
        const pendingChunks = useRef<ChunkBufferStore>({})
        const pendingTheme = useRef(colorScheme)

        // Track network connectivity
        useEffect(() => {
            const unsubscribe = NetInfo.addEventListener(state => {
                setIsConnected(state.isConnected ?? true)
            })
            return unsubscribe
        }, [])

        const post = (message: { type: string; payload?: unknown }) => {
            webViewRef.current?.postMessage(JSON.stringify(message))
        }

        const sendText = (type: string, text: string) => {
            sendChunkedText(post, type, text)
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
            // Simplified URL selection logic:
            // - Dev mode (__DEV__): Always use localhost (web dev server)
            // - Production (!__DEV__): Always try local bundle first, fallback to remote
            
            if (__DEV__) {
                // Dev mode: Use localhost web server
                const extra = Constants.expoConfig?.extra
                const configuredFromExtra = extra?.editorWebViewUrl
                const configuredFromEnv =
                    extra?.appVariant === 'dev' ? process.env.EXPO_PUBLIC_EDITOR_WEBVIEW_URL?.trim() : ''
                const configured =
                    (typeof configuredFromExtra === 'string' ? configuredFromExtra.trim() : '') || configuredFromEnv
                
                if (configured) return configured
                
                // Auto-detect dev server from Expo
                const host = Constants.expoConfig?.hostUri?.split(':').shift()
                if (host && host.length > 0) {
                    return `http://${host}:3000/editor-webview`
                }
                return 'http://localhost:3000/editor-webview'
            }
            
            // Production mode: Try local bundle first, fallback to remote
            const localBundleUrl = getLocalBundleUrl()
            if (localBundleUrl) {
                console.log('[EditorWebView] Using local bundle:', localBundleUrl)
                return localBundleUrl
            }
            
            // Fallback: Remote URL (Cloudflare Pages)
            const remoteUrl = 'https://everfreenote.pages.dev/editor-webview'
            console.log('[EditorWebView] Local bundle not available, using remote:', remoteUrl)
            return remoteUrl
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
              (function() {
                var theme = ${JSON.stringify(colorScheme)};
                try { localStorage.setItem('everfreenote-theme', theme); } catch (e) {}
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
              window.__EVERFREENOTE_MOBILE__ = {
                devHost: ${JSON.stringify(devHost)},
                supabaseUrl: ${JSON.stringify(supabaseUrl)},
                theme: ${JSON.stringify(colorScheme)},
                isConnected: ${JSON.stringify(isConnected)},
                platform: ${JSON.stringify(Constants.platform?.os || 'unknown')},
              };
              true;
            `
        })()

        const handleMessage = (event: WebViewMessageEvent) => {
            try {
                const { type, payload } = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: unknown }
                if (!type) return

                const chunked = consumeChunkedMessage(type, payload, pendingChunks.current)
                if (chunked) {
                    if (chunked.baseType === 'CONTENT_CHANGED' || chunked.baseType === 'CONTENT_ON_BLUR') {
                        onContentChange?.(chunked.text)
                        return
                    }
                    if (chunked.baseType === 'CONTENT_RESPONSE') {
                        if (contentResolver.current) {
                            contentResolver.current(chunked.text)
                            contentResolver.current = null
                        }
                        return
                    }
                }

                switch (type) {
                    case 'READY':
                        if (pendingContent.current !== null) {
                            sendText('SET_CONTENT', pendingContent.current)
                            pendingContent.current = null
                        }
                        if (pendingTheme.current) {
                            post({ type: 'SET_THEME', payload: pendingTheme.current })
                        }
                        setIsReady(true)
                        onReady?.()
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
                    case 'IMAGE_ERROR': {
                        const p = payload as { src?: unknown; message?: unknown }
                        console.error('[EditorWebView] Image failed to load:', p?.src, p?.message)
                        break
                    }
                    case 'EDITOR_FOCUS':
                        onFocus?.()
                        break
                    case 'EDITOR_BLUR':
                        onBlur?.()
                        break
                    case 'CONTENT_ON_BLUR':
                        // Safety net: content sent on blur ensures nothing is lost
                        onContentChange?.(String(payload ?? ''))
                        break
                }
            } catch (error) {
                console.error('[EditorWebView] Failed to parse message:', error)
            }
        }

        useEffect(() => {
            pendingTheme.current = colorScheme
            if (isReady) {
                post({ type: 'SET_THEME', payload: colorScheme })
            }
        }, [colorScheme, isReady])

        useEffect(() => {
            if (isReady) {
                post({ type: 'NETWORK_STATUS', payload: isConnected })
            }
        }, [isConnected, isReady])

        if (!editorUrl) {
            return (
                <View style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <Text style={styles.errorTitle}>Editor URL missing</Text>
                        <Text style={styles.errorSubtitle}>
                            For dev builds, set EXPO_PUBLIC_EDITOR_WEBVIEW_URL. For stage builds, set
                            EXPO_PUBLIC_STAGE_BRANCH + EXPO_PUBLIC_STAGE_DOMAIN.
                        </Text>
                    </View>
                </View>
            )
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
                    <View style={loadingFallback ? styles.fallbackContainer : styles.loadingContainer}>
                        {loadingFallback ?? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        )}
                    </View>
                )}
            </View>
        )
    }
)

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    fallbackContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
    },
    errorTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        color: colors.destructive,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: colors.mutedForeground,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorUrl: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: colors.mutedForeground,
        textAlign: 'center',
    },
})

EditorWebView.displayName = 'EditorWebView'

export default EditorWebView
