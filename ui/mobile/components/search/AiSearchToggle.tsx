import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'

type AiSearchToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export const AiSearchToggle = memo(function AiSearchToggle({
  enabled,
  onChange,
  disabled = false,
}: AiSearchToggleProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable
      testID="ai-search-toggle"
      onPress={() => {
        if (disabled) return
        onChange(!enabled)
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled }}
      style={({ pressed }) => [
        styles.container,
        enabled && styles.containerEnabled,
        disabled && styles.containerDisabled,
        pressed && !disabled && styles.containerPressed,
      ]}
    >
      <View style={[styles.thumb, enabled && styles.thumbEnabled]} />
      <Sparkles size={14} color={enabled ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.label, enabled && styles.labelEnabled]}>AI Search</Text>
    </Pressable>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  containerEnabled: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  containerPressed: {
    opacity: 0.8,
  },
  thumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  thumbEnabled: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
  },
  labelEnabled: {
    color: colors.primary,
  },
})
