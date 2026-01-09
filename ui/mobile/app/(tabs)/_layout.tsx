import { Redirect, Tabs } from 'expo-router'
import { useAuth, useTheme } from '@ui/mobile/providers'
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus, useOfflineSync } from '@ui/mobile/hooks'
import { FileText, Search, Settings, WifiOff } from 'lucide-react-native'
import { useMemo } from 'react'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'

export default function TabsLayout() {
  const { isAuthenticated, loading } = useAuth()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isOnline = useNetworkStatus()
  const insets = useSafeAreaInsets()
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

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={[styles.offlineBanner, { paddingTop: insets.top + 6 }]}>
          <View style={styles.offlineContent}>
            <WifiOff size={14} color={colors.mutedForeground} />
            <Text style={styles.offlineText}>
              Offline mode. Changes are saved locally and will sync when you're back online.
            </Text>
          </View>
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
    backgroundColor: colors.muted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: 'center',
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  offlineText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
    lineHeight: 16,
    flexShrink: 1,
  },
  headerToggle: {
    marginRight: 12,
  },
})

