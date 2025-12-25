import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { useMemo, useState } from 'react'
import { featureFlags } from '@ui/mobile/featureFlags'
import { AuthService } from '@core/services/auth'
import { oauthAdapter } from '@ui/mobile/adapters'
import { Button } from '@ui/mobile/components/ui'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'

export default function LoginScreen() {
  const { client } = useSupabase()
  const { colors } = useTheme()
  const router = useRouter()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingTest, setLoadingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const styles = useMemo(() => createStyles(colors), [colors])
  const loading = loadingGoogle || loadingTest

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true)
      setError(null)

      const authService = new AuthService(client)
      const { data, error } = await authService.signInWithGoogle('everfreenote://auth/callback')

      if (error) throw error
      if (!data.url) throw new Error('Missing OAuth URL')

      await oauthAdapter.startOAuth(data.url)
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoadingGoogle(false)
    }
  }

  const handleTestLogin = async () => {
    if (!featureFlags.testAuth) return

    try {
      setLoadingTest(true)
      setError(null)
      const authService = new AuthService(client)
      const { error } = await authService.signInWithPassword(
        'test@example.com',
        'testpassword123'
      )

      if (error) throw error

      router.replace('/(tabs)')
    } catch (err) {
      console.error('Test login error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка тестового входа')
    } finally {
      setLoadingTest(false)
    }
  }

  return (
    <View style={styles.container}>
      <ThemeToggle style={styles.themeToggle} />
      <Text style={styles.title}>EverFreeNote</Text>
      <Text style={styles.subtitle}>Ваши заметки всегда с вами</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        size="lg"
        loading={loadingGoogle}
        disabled={loading}
        onPress={() => void handleGoogleLogin()}
        style={styles.button}
      >
        Войти через Google
      </Button>

      {featureFlags.testAuth && (
        <Button
          variant="outline"
          loading={loadingTest}
          disabled={loading}
          onPress={() => void handleTestLogin()}
          style={styles.testButton}
        >
          Тестовый вход
        </Button>
      )}
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 32,
    minWidth: 200,
  },
  testButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    minWidth: 200,
  },
  error: {
    fontFamily: 'Inter_400Regular',
    color: colors.destructive,
    marginBottom: 16,
    textAlign: 'center',
  },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
})
