import { Redirect } from 'expo-router'
import { useAuth } from '@ui/mobile/providers'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}
