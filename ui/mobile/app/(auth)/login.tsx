import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSupabase } from '@ui/mobile/providers'
import { useState } from 'react'
import { featureFlags } from '@ui/mobile/featureFlags'
import { AuthService } from '@core/services/auth'
import { oauthAdapter } from '@ui/mobile/adapters'

export default function LoginScreen() {
  const { client } = useSupabase()
  const router = useRouter()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingTest, setLoadingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <Text style={styles.title}>EverFreeNote</Text>
      <Text style={styles.subtitle}>Ваши заметки всегда с вами</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void handleGoogleLogin()}
        disabled={loading}
      >
        {loadingGoogle ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Войти через Google</Text>
        )}
      </Pressable>

      {featureFlags.testAuth && (
        <Pressable
          style={[styles.testButton, loading && styles.buttonDisabled]}
          onPress={() => void handleTestLogin()}
          disabled={loading}
        >
          {loadingTest ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <Text style={styles.testButtonText}>Тестовый вход</Text>
          )}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  testButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
})
