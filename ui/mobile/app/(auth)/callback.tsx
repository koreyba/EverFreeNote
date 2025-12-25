import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { useMemo } from 'react'

export default function CallbackScreen() {
  const router = useRouter()
  const { client } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const params = useLocalSearchParams()

  useEffect(() => {
    void handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const code = params.code as string | undefined
      const accessToken = params.access_token as string | undefined
      const refreshToken = params.refresh_token as string | undefined

      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code)
        if (error) throw error
        router.replace('/(tabs)')
        return
      }

      if (accessToken && refreshToken) {
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
      console.error('Callback error:', error)
      // Navigate back to login on error
      router.replace('/(auth)/login')
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Завершение входа...</Text>
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
