import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useMemo } from 'react'
import { useTheme, useAuth } from '@ui/mobile/providers'
import type { ThemeMode } from '@ui/mobile/lib/theme'

export default function SettingsScreen() {
  const { colors, mode, setMode, colorScheme } = useTheme()
  const { signOut } = useAuth()
  const styles = useMemo(() => createStyles(colors), [colors])

  const options: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'system', label: 'System', description: 'Follow device setting' },
    { value: 'light', label: 'Light', description: 'Always light theme' },
    { value: 'dark', label: 'Dark', description: 'Always dark theme' },
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Appearance</Text>
      <Text style={styles.subtitle}>Current: {mode} ({colorScheme})</Text>

      <View style={styles.card}>
        {options.map((option) => {
          const isSelected = mode === option.value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Theme option ${option.label}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
                isSelected && styles.optionSelected,
              ]}
              onPress={() => setMode(option.value)}
            >
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          )
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.signOutButtonPressed,
        ]}
        onPress={() => void signOut()}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
  optionPressed: {
    backgroundColor: colors.muted,
  },
  optionText: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  signOutButton: {
    marginTop: 24,
    backgroundColor: colors.destructive,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonPressed: {
    opacity: 0.8,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.destructiveForeground,
  },
})
