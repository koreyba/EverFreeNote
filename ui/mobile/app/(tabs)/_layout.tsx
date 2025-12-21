import { Redirect, Tabs } from 'expo-router'
import { useAuth, useTheme } from '@ui/mobile/providers'
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native'
import { useNetworkStatus, useOfflineSync } from '@ui/mobile/hooks'
import { FileText, Search, Settings } from 'lucide-react-native'
import { useMemo } from 'react'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'

export default function TabsLayout() {
  const { isAuthenticated, loading } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  useOfflineSync()

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const isOnline = useNetworkStatus()

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Вы работаете оффлайн. Изменения сохранятся локально.
          </Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.foreground,
          headerRight: () => <ThemeToggle style={styles.headerToggle} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Заметки',
            tabBarLabel: 'Заметки',
            tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Поиск',
            tabBarLabel: 'Поиск',
            tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Настройки',
            tabBarLabel: 'Настройки',
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
      </Tabs>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  offlineBanner: {
    backgroundColor: colors.destructive,
    paddingVertical: 4,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.destructiveForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  headerToggle: {
    marginRight: 12,
  },
})
