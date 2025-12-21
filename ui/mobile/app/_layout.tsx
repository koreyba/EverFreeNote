import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SupabaseProvider, ThemeProvider, useTheme } from '@ui/mobile/providers'
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
    <SafeAreaProvider>
      <ThemeProvider>
        <SupabaseProvider>
          <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="note/[id]"
              options={{
                headerShown: true,
                title: 'Редактирование',
                presentation: 'modal',
              }}
            />
          </Stack>
            <ThemedStatusBar />
          </QueryClientProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
