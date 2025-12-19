import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SupabaseProvider } from '@ui/mobile/providers'
import './global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  )
}
