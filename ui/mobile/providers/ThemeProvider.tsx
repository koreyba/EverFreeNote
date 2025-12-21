import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { getThemeColors, type ColorScheme, type ThemeMode } from '@ui/mobile/lib/theme'

type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  colorScheme: ColorScheme
  colors: ReturnType<typeof getThemeColors>
  isHydrated: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'everfreenote.theme.mode'

const resolveColorScheme = (mode: ThemeMode, systemScheme: ColorScheme): ColorScheme => {
  if (mode === 'system') return systemScheme
  return mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const systemScheme: ColorScheme = system === 'dark' ? 'dark' : 'light'

  const [mode, setModeState] = useState<ThemeMode>('system')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        const saved = raw === 'light' || raw === 'dark' || raw === 'system' ? (raw as ThemeMode) : null
        if (!cancelled && saved) {
          setModeState(saved)
        }
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    void AsyncStorage.setItem(STORAGE_KEY, next)
  }, [])

  const colorScheme = resolveColorScheme(mode, systemScheme)
  const colors = useMemo(() => getThemeColors(colorScheme), [colorScheme])

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    setMode,
    colorScheme,
    colors,
    isHydrated,
  }), [mode, setMode, colorScheme, colors, isHydrated])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

