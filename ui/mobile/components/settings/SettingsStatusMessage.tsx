import { StyleSheet, Text, View } from 'react-native'
import { useMemo } from 'react'
import { CircleAlert, CircleCheckBig, Info } from 'lucide-react-native'

import { useTheme } from '@ui/mobile/providers'

type SettingsStatusMessageProps = {
  message: string
  variant: 'error' | 'success' | 'info'
}

export function SettingsStatusMessage({ message, variant }: SettingsStatusMessageProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const palette = {
    error: {
      backgroundColor: colors.destructive + '22',
      borderColor: colors.destructive + '55',
      color: colors.destructive,
      icon: CircleAlert,
    },
    success: {
      backgroundColor: colors.primary + '22',
      borderColor: colors.primary + '55',
      color: colors.primary,
      icon: CircleCheckBig,
    },
    info: {
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      color: colors.foreground,
      icon: Info,
    },
  }[variant]

  const Icon = palette.icon

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Icon size={16} color={palette.color} />
      <Text style={[styles.message, { color: palette.color }]}>{message}</Text>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    message: {
      flex: 1,
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      lineHeight: 18,
      color: colors.foreground,
    },
  })
