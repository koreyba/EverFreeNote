import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CheckSquare, LogOut, Monitor, Moon, Square, Sun, User } from 'lucide-react-native'

import { Button } from '@ui/mobile/components/ui'
import { useTheme } from '@ui/mobile/providers'
import type { ColorScheme, ThemeMode } from '@ui/mobile/lib/theme'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type AccountSettingsPanelProps = {
  email: string
  mode: ThemeMode
  colorScheme: ColorScheme
  onModeChange: (mode: ThemeMode) => void
  onSignOut: () => Promise<void> | void
  onDeleteAccount: () => Promise<void>
}

const themeOptions: Array<{
  value: ThemeMode
  label: string
  icon: typeof Monitor
}> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function AccountSettingsPanel({
  email,
  mode,
  colorScheme,
  onModeChange,
  onSignOut,
  onDeleteAccount,
}: AccountSettingsPanelProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [understandDeletion, setUnderstandDeletion] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!understandDeletion || isDeleting) return

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await onDeleteAccount()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<User size={20} color={colors.foreground} />}
      title="My Account"
      subtitle="Email and account management."
    >
      <View style={styles.section}>
        <Text style={styles.eyebrow}>EMAIL</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.themeHeader}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.caption}>{`Current: ${mode} (${colorScheme})`}</Text>
        </View>

        <View style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = option.value === mode

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Theme option ${option.label}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onModeChange(option.value)}
                style={({ pressed }) => [
                  styles.themeOption,
                  isSelected && styles.themeOptionSelected,
                  pressed && styles.themeOptionPressed,
                ]}
              >
                <Icon size={16} color={isSelected ? colors.background : colors.foreground} />
                <Text style={[styles.themeLabel, isSelected && styles.themeLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.warningBlock}>
        <Text style={styles.warningTitle}>Permanent action</Text>
        <Text style={styles.warningBody}>
          This will permanently delete your account and all notes. Export your notes before
          deleting the account if you need a copy.
        </Text>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: understandDeletion }}
        disabled={isDeleting}
        onPress={() => setUnderstandDeletion((value) => !value)}
        style={({ pressed }) => [styles.checkboxRow, pressed && styles.checkboxRowPressed]}
      >
        {understandDeletion ? (
          <CheckSquare size={18} color={colors.primary} />
        ) : (
          <Square size={18} color={colors.mutedForeground} />
        )}
        <Text style={styles.checkboxLabel}>
          I understand that my account and all notes will be permanently deleted.
        </Text>
      </Pressable>

      {errorMessage ? (
        <SettingsStatusMessage message={errorMessage} variant="error" />
      ) : null}

      <View style={styles.actions}>
        <Button variant="outline" onPress={() => void onSignOut()} style={styles.actionButton}>
          <View style={styles.buttonContent}>
            <LogOut size={16} color={colors.foreground} />
            <Text style={styles.outlineButtonText}>Sign out</Text>
          </View>
        </Button>

        <Button
          variant="destructive"
          onPress={() => void handleDelete()}
          loading={isDeleting}
          disabled={!understandDeletion || isDeleting}
          style={styles.actionButton}
        >
          Delete account
        </Button>
      </View>
    </SettingsPanelCard>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    section: {
      gap: 8,
    },
    eyebrow: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.6,
    },
    email: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
    },
    themeHeader: {
      gap: 4,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
    },
    caption: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },
    themeOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    themeOption: {
      minWidth: 92,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    themeOptionSelected: {
      backgroundColor: colors.foreground,
      borderColor: colors.foreground,
    },
    themeOptionPressed: {
      opacity: 0.85,
    },
    themeLabel: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    themeLabelSelected: {
      color: colors.background,
    },
    warningBlock: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.destructive + '55',
      backgroundColor: colors.destructive + '12',
      padding: 14,
      gap: 8,
    },
    warningTitle: {
      color: colors.destructive,
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
    },
    warningBody: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 22,
    },
    checkboxRow: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkboxRowPressed: {
      opacity: 0.85,
    },
    checkboxLabel: {
      flex: 1,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 22,
    },
    actions: {
      gap: 10,
      alignItems: 'stretch',
    },
    actionButton: {
      width: '100%',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
    },
    outlineButtonText: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
  })
