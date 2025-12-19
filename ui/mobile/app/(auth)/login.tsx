import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useSupabase } from '@ui/mobile/providers'
import { useState } from 'react'

export default function LoginScreen() {
  const { client } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'everfreenote://auth/callback',
        },
      })

      if (error) throw error

      // OAuth flow will handle redirection via deep linking
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Ошибка входа')
      setLoading(false)
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
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Войти через Google</Text>
        )}
      </Pressable>
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
  error: {
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
})
