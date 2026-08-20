import { Redirect, Tabs, usePathname } from 'expo-router'
import { CollapsibleTabBarProvider, useAuth, useCollapsibleTabBar, useTheme } from '@ui/mobile/providers'
import { ActivityIndicator, Animated, View, Text, StyleSheet, type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus, useOfflineSync } from '@ui/mobile/hooks'
import { FileText, Search, Settings, Tags, WifiOff } from 'lucide-react-native'
import { useEffect, useMemo, useRef } from 'react'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'

type TabBarIconProps = Readonly<{ color: ColorValue }>
type TabsLayoutContentProps = Readonly<{
  colors: ReturnType<typeof useTheme>['colors']
  isOnline: boolean
  styles: ReturnType<typeof createStyles>
  topInset: number
}>

const TagsTabIcon = ({ color }: TabBarIconProps) => <Tags size={24} color={color} />

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
    <CollapsibleTabBarProvider>
      <TabsLayoutContent
        colors={colors}
        isOnline={isOnline}
        styles={styles}
        topInset={insets.top}
      />
    </CollapsibleTabBarProvider>
  )
}

function TabsLayoutContent({
  colors,
  isOnline,
  styles,
  topInset,
}: TabsLayoutContentProps) {
  const pathname = usePathname()
  const { isVisible, reset } = useCollapsibleTabBar()
  const tabBarTranslateY = useRef(new Animated.Value(0)).current
  const tabBarOpacity = tabBarTranslateY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
  })

  useEffect(() => {
    reset()
  }, [pathname, reset])

  useEffect(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: isVisible ? 0 : 100,
      duration: 180,
      useNativeDriver: true,
    }).start()
  }, [isVisible, tabBarTranslateY])

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={[styles.offlineBanner, { paddingTop: topInset + 6 }]}>
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
            opacity: tabBarOpacity,
            transform: [{ translateY: tabBarTranslateY }],
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
            title: 'Notes',
            tabBarLabel: 'Notes',
            tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarLabel: 'Search',
            tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tags"
          options={{
            title: 'Tags',
            tabBarLabel: 'Tags',
            tabBarIcon: TagsTabIcon,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
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

