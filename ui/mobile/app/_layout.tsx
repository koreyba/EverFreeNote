import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Toast from 'react-native-toast-message'
import type { ToastConfig } from 'react-native-toast-message'
import { SupabaseProvider, ThemeProvider, useTheme, SwipeProvider } from '@ui/mobile/providers'
import { SnackbarToast } from '@ui/mobile/components/SnackbarToast'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import './global.css'

// Prevent splash screen from auto-hiding before fonts load
void SplashScreen.preventAutoHideAsync()

const toastConfig: ToastConfig = {
  success: (props) => <SnackbarToast {...props} />,
  error: (props) => <SnackbarToast {...props} />,
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
})

function ThemedStatusBar() {
  const { colorScheme } = useTheme()
  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
}

function ThemedStack() {
  const { colors } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="note/[id]"
        options={{
          headerShown: true,
          presentation: 'modal',
        }}
      />
    </Stack>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  // Wait for fonts to load
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SupabaseProvider>
            <QueryClientProvider client={queryClient}>
              <SwipeProvider>
                <ThemedStack />
                <ThemedStatusBar />
                <Toast
                  config={toastConfig}
                  position="bottom"
                  bottomOffset={80}
                  visibilityTime={2500}
                  onPress={() => Toast.hide()}
                />
              </SwipeProvider>
            </QueryClientProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
