import { useEffect, useMemo, useCallback } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSupabase, useTheme } from '@ui/mobile/providers'

// Validate auth code format (typically alphanumeric, 20-100 chars)
const isValidAuthCode = (code: string): boolean => {
  if (typeof code !== 'string') return false
  if (code.length < 20 || code.length > 200) return false
  // Auth codes are typically base64url encoded or alphanumeric with dashes
  return /^[A-Za-z0-9_-]+$/.test(code)
}

// Validate JWT format (3 base64url parts separated by dots)
const isValidJWT = (token: string): boolean => {
  if (typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  // Each part should be base64url encoded
  return parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))
}

export default function CallbackScreen() {
  const router = useRouter()
  const { client } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const params = useLocalSearchParams()

  const handleCallback = useCallback(async () => {
    try {
      if (__DEV__) {
        console.warn('[Callback] Received params:', JSON.stringify(params))
      }

      const code = params.code as string | undefined
      const accessToken = params.access_token as string | undefined
      const refreshToken = params.refresh_token as string | undefined

      // Validate and use auth code flow (preferred)
      if (code) {
        if (!isValidAuthCode(code)) {
          throw new Error('Invalid auth code format')
        }
        const { error } = await client.auth.exchangeCodeForSession(code)
        if (error) throw error
        router.replace('/(tabs)')
        return
      }

      // Validate and use token flow (fallback)
      if (accessToken && refreshToken) {
        if (!isValidJWT(accessToken) || !isValidJWT(refreshToken)) {
          throw new Error('Invalid token format')
        }
        const { error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) throw error
        router.replace('/(tabs)')
        return
      }

      throw new Error('Missing code/tokens in callback')
    } catch (error) {
      // Don't log full error details in production to avoid leaking sensitive info
      if (__DEV__) {
        console.error('Callback error:', error)
      }
      router.replace('/(auth)/login')
    }
  }, [client.auth, params.access_token, params.code, params.refresh_token, router])

  useEffect(() => {
    void handleCallback()
  }, [handleCallback])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Completing sign-in...</Text>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mutedForeground,
  },
})
