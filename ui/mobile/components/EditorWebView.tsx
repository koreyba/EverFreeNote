import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, ActivityIndicator, Text, Pressable } from 'react-native'
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

type EditorWebViewSource = {
    uri: string
    source: 'remote' | 'local'
    reason: 'online' | 'offline' | 'load-error' | 'http-error' | 'ready-timeout'
}

const resolveInitialSource = ({
    isConnected,
    remoteUrl,
    localUrl,
}: {
    isConnected: boolean
    remoteUrl: string
    localUrl: string | null
}): EditorWebViewSource | null => {
    if (isConnected) {
        if (remoteUrl) {
            return { uri: remoteUrl, source: 'remote', reason: 'online' }
        }
        if (localUrl) {
            return { uri: localUrl, source: 'local', reason: 'online' }
        }
        return null
    }

    if (localUrl) {
        return { uri: localUrl, source: 'local', reason: 'offline' }
    }

    return null
}

const formatDebugValue = (value: string | null) => {
    if (!value) {
        return 'missing'
    }
    return value
}

const EditorWebView = forwardRef<EditorWebViewHandle, Props>(
    ({ initialContent = '', onContentChange, onReady, onFocus, onBlur, loadingFallback }, ref) => {
        const webViewRef = useRef<WebView>(null)
        const { colors, colorScheme } = useTheme()
        const styles = useMemo(() => createStyles(colors), [colors])
        const [isReady, setIsReady] = useState(false)
        const [loadError, setLoadError] = useState<string | null>(null)
        const [isConnected, setIsConnected] = useState(true)
        const [editorSource, setEditorSource] = useState<EditorWebViewSource | null>(null)
        const [isDebugOpen, setIsDebugOpen] = useState(false)
        const pendingContent = useRef<string | null>(initialContent)
        const contentResolver = useRef<((html: string) => void) | null>(null)
        const pendingChunks = useRef<ChunkBufferStore>({})
        const pendingTheme = useRef(colorScheme)
        const hasFallback = useRef(false)
        const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
        const appVariant = useMemo(() => {
            const extra = Constants.expoConfig?.extra
            return typeof extra?.appVariant === 'string' ? extra.appVariant : 'unknown'
        }, [])
        const showDebugBadge = appVariant === 'dev'
        const remoteUrl = useMemo(() => {
            const extra = Constants.expoConfig?.extra
            return typeof extra?.editorWebViewUrl === 'string' ? extra.editorWebViewUrl.trim() : ''
        }, [])
        const localBundleUrl = useMemo(() => getLocalBundleUrl(), [])

        // Track network connectivity
        useEffect(() => {
            const unsubscribe = NetInfo.addEventListener(state => {
                setIsConnected(state.isConnected ?? true)
            })
            return unsubscribe
        }, [])

        useEffect(() => {
            if (isReady) return
            if (hasFallback.current) return
            const nextSource = resolveInitialSource({
                isConnected,
                remoteUrl,
                localUrl: localBundleUrl,
            })
            setEditorSource(nextSource)
            if (nextSource) {
                if (__DEV__) {
                    console.warn(
                        `[EditorWebView] Selected ${nextSource.source} (${nextSource.reason}):`,
                        nextSource.uri
                    )
                }
            } else {
                console.error('[EditorWebView] Editor URL missing: no remote or local bundle available')
            }
        }, [isConnected, isReady, localBundleUrl, remoteUrl])

        useEffect(() => {
            if (isReady) return
            if (editorSource?.source !== 'remote') return
            if (readyTimeoutRef.current) {
                clearTimeout(readyTimeoutRef.current)
            }
            readyTimeoutRef.current = setTimeout(() => {
                fallbackToLocal('ready-timeout', 'WebView READY timeout')
            }, 1000)

            return () => {
                if (readyTimeoutRef.current) {
                    clearTimeout(readyTimeoutRef.current)
                    readyTimeoutRef.current = null
                }
            }
        }, [editorSource?.source, isReady])

        const post = (message: { type: string; payload?: unknown }) => {
            webViewRef.current?.postMessage(JSON.stringify(message))
        }

        const sendText = (type: string, text: string) => {
            sendChunkedText(post, type, text)
        }

        const fallbackToLocal = (reason: EditorWebViewSource['reason'], errorMessage?: string) => {
            if (hasFallback.current) {
                if (errorMessage) {
                    setLoadError(errorMessage)
                }
                return
            }
            if (editorSource?.source !== 'remote') {
                if (errorMessage) {
                    setLoadError(errorMessage)
                }
                return
            }
            if (!localBundleUrl) {
                setLoadError(errorMessage ?? 'WebView failed to load editor page')
                return
            }
            hasFallback.current = true
            setLoadError(null)
            setEditorSource({ uri: localBundleUrl, source: 'local', reason })
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

        const editorUrl = editorSource?.uri ?? ''

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
                platform: ${JSON.stringify(Constants.platform?.os ?? 'unknown')},
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
                        if (readyTimeoutRef.current) {
                            clearTimeout(readyTimeoutRef.current)
                            readyTimeoutRef.current = null
                        }
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
                        if (isReady) return
                        const description = syntheticEvent.nativeEvent.description
                        console.error('[EditorWebView] Load error:', description)
                        fallbackToLocal('load-error', description || 'WebView failed to load editor page')
                    }}
                    onHttpError={(syntheticEvent) => {
                        if (isReady) return
                        const statusCode = syntheticEvent.nativeEvent.statusCode
                        const description = syntheticEvent.nativeEvent.description
                        console.error('[EditorWebView] HTTP error:', statusCode, description)
                        fallbackToLocal(
                            'http-error',
                            `HTTP ${statusCode}: ${description || 'Failed to load editor page'}`
                        )
                    }}
                    // @ts-expect-error - onConsoleMessage exists in native code but not in TS types
                    onConsoleMessage={(event: { nativeEvent: { level: string; message: string } }) => {
                        if (!__DEV__) return
                        const { level, message } = event.nativeEvent
                        console.warn(`[WebView Console ${level}]:`, message)
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
                {showDebugBadge && (
                    <View style={styles.debugContainer} pointerEvents="box-none">
                        <Pressable
                            onPress={() => setIsDebugOpen((prev) => !prev)}
                            style={styles.debugBadge}
                        >
                            <Text style={styles.debugBadgeText}>
                                {editorSource?.source ?? 'missing'}
                            </Text>
                        </Pressable>
                        {isDebugOpen && (
                            <View style={styles.debugPanel}>
                                <Text style={styles.debugTitle}>WebView Debug</Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>variant:</Text> {appVariant}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>source:</Text> {editorSource?.source ?? 'missing'}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>reason:</Text> {editorSource?.reason ?? 'n/a'}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>connected:</Text> {isConnected ? 'yes' : 'no'}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>ready:</Text> {isReady ? 'yes' : 'no'}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>active url:</Text>
                                </Text>
                                <Text style={styles.debugUrl} numberOfLines={2}>
                                    {formatDebugValue(editorUrl)}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>remote url:</Text>
                                </Text>
                                <Text style={styles.debugUrl} numberOfLines={2}>
                                    {formatDebugValue(remoteUrl)}
                                </Text>
                                <Text style={styles.debugRow}>
                                    <Text style={styles.debugLabel}>local url:</Text>
                                </Text>
                                <Text style={styles.debugUrl} numberOfLines={2}>
                                    {formatDebugValue(localBundleUrl)}
                                </Text>
                            </View>
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
    debugContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        alignItems: 'flex-end',
        zIndex: 10,
    },
    debugBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    debugBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter_700Bold',
        color: colors.background,
    },
    debugPanel: {
        marginTop: 6,
        backgroundColor: colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        minWidth: 220,
        maxWidth: 280,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    debugTitle: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
        color: colors.foreground,
        marginBottom: 6,
    },
    debugRow: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: colors.mutedForeground,
        marginBottom: 2,
    },
    debugLabel: {
        fontFamily: 'Inter_700Bold',
        color: colors.foreground,
    },
    debugUrl: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: colors.mutedForeground,
        marginBottom: 4,
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
