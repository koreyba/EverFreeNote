import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@ui/mobile/providers'
import { ActivityIndicator, View, Text } from 'react-native'
import { useNetworkStatus } from '@ui/mobile/hooks'

export default function TabsLayout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const isOnline = useNetworkStatus()

  return (
    <View style={{ flex: 1 }}>
      {!isOnline && (
        <View style={{ backgroundColor: '#ff9800', padding: 4, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            Вы работаете оффлайн. Изменения сохранятся локально.
          </Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#4285F4',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Заметки',
            tabBarLabel: 'Заметки',
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Поиск',
            tabBarLabel: 'Поиск',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Настройки',
            tabBarLabel: 'Настройки',
          }}
        />
      </Tabs>
    </View>
  )
}
