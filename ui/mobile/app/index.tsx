import { Redirect } from 'expo-router'

export default function Index() {
  // TODO: проверить авторизацию
  const isAuthenticated = false

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}
