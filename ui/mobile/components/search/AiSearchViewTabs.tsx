import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { MobileSearchViewMode } from '@ui/mobile/hooks/useMobileSearchMode'
import { useTheme } from '@ui/mobile/providers'

type AiSearchViewTabsProps = {
  value: MobileSearchViewMode
  onChange: (mode: MobileSearchViewMode) => void
  disabled?: boolean
}

const TABS: { value: MobileSearchViewMode; label: string }[] = [
  { value: 'note', label: 'Notes' },
  { value: 'chunk', label: 'Chunks' },
]

export const AiSearchViewTabs = memo(function AiSearchViewTabs({
  value,
  onChange,
  disabled = false,
}: AiSearchViewTabsProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {TABS.map((tab) => {
        const active = value === tab.value
        return (
          <Pressable
            key={tab.value}
            testID={`ai-search-view-tab-${tab.value}`}
            disabled={disabled}
            onPress={() => {
              if (disabled) return
              onChange(tab.value)
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled }}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && !disabled && styles.tabPressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  tabPressed: {
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
