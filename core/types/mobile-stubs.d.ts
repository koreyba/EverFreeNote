declare module 'react-native' {
  export const Linking: {
    openURL: (url: string) => Promise<void>
  }
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>
    setItem(key: string, value: string): Promise<void>
    removeItem(key: string): Promise<void>
  }
  export default AsyncStorage
}

declare module 'expo-web-browser' {
  export function openAuthSessionAsync(url: string, redirectUrl: string): Promise<{ type: string; url?: string }>
}

declare module 'expo-auth-session' {
  export function maybeCompleteAuthSession(): { type?: string; url?: string; redirectUri?: string }
}
