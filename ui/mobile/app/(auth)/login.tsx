import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'

export default function LoginScreen() {
  const router = useRouter()

  const handleGoogleLogin = () => {
    // TODO: реализовать OAuth через expo-web-browser
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EverFreeNote</Text>
      <Text style={styles.subtitle}>Ваши заметки всегда с вами</Text>

      <Pressable style={styles.button} onPress={handleGoogleLogin}>
        <Text style={styles.buttonText}>Войти через Google</Text>
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
