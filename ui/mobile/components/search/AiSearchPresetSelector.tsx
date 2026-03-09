import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { SearchPreset } from '@core/constants/aiSearch'
import { useTheme } from '@ui/mobile/providers'

const PRESETS: { value: SearchPreset; label: string }[] = [
  { value: 'strict', label: 'Strict' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'broad', label: 'Broad' },
]

type AiSearchPresetSelectorProps = {
  value: SearchPreset
  onChange: (preset: SearchPreset) => void
}

export const AiSearchPresetSelector = memo(function AiSearchPresetSelector({
  value,
  onChange,
}: AiSearchPresetSelectorProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      {PRESETS.map((preset) => {
        const active = preset.value === value
        return (
          <Pressable
            key={preset.value}
            onPress={() => onChange(preset.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.button,
              active && styles.buttonActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{preset.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.mutedForeground,
  },
  labelActive: {
    color: colors.primary,
  },
})
