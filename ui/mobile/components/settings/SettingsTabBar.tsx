import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native'
import { useMemo } from 'react'

import { useTheme } from '@ui/mobile/providers'

export type SettingsTabKey = 'account' | 'import' | 'export' | 'wordpress' | 'apiKeys'

export type SettingsTabDefinition = {
  key: SettingsTabKey
  label: string
}

type SettingsTabBarProps = {
  tabs: SettingsTabDefinition[]
  activeTab: SettingsTabKey
  onChange: (tab: SettingsTabKey) => void
}

export function SettingsTabBar({ tabs, activeTab, onChange }: SettingsTabBarProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.wrap}>
      <ScrollView
        accessibilityRole="tablist"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    wrap: {
      paddingBottom: 4,
    },
    content: {
      gap: 10,
      paddingRight: 8,
    },
    tab: {
      minHeight: 42,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    tabActive: {
      backgroundColor: colors.foreground,
      borderColor: colors.foreground,
    },
    tabPressed: {
      opacity: 0.85,
    },
    label: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    labelActive: {
      color: colors.background,
    },
  })
