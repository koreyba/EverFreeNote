import React, { useMemo } from 'react'
import { Pressable, StyleSheet, type ViewStyle } from 'react-native'
import { Moon, Sun } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'

type Props = {
  style?: ViewStyle
}

export function ThemeToggle({ style }: Props) {
  const { colors, colorScheme, setMode } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isDark = colorScheme === 'dark'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Toggle theme"
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        style,
      ]}
      onPress={() => setMode(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Sun size={18} color={colors.foreground} />
      ) : (
        <Moon size={18} color={colors.foreground} />
      )}
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.accent,
  },
})

