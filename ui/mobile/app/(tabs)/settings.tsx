import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native'
import { useMemo, useState } from 'react'
import { useTheme, useAuth } from '@ui/mobile/providers'
import type { ThemeMode } from '@ui/mobile/lib/theme'
import { Square, CheckSquare } from 'lucide-react-native'
import { Button } from '@ui/mobile/components/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SettingsSectionHeader } from '@ui/mobile/components/settings/SettingsSectionHeader'
import { SettingsRow } from '@ui/mobile/components/settings/SettingsRow'
import { ComingSoonBadge } from '@ui/mobile/components/settings/ComingSoonBadge'
import { GeminiApiKeySection } from '@ui/mobile/components/settings/GeminiApiKeySection'

export default function SettingsScreen() {
  const { colors, mode, setMode, colorScheme } = useTheme()
  const { signOut, deleteAccount } = useAuth()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [understandDeletion, setUnderstandDeletion] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
    { value: 'system', label: 'System', description: 'Follow device setting' },
    { value: 'light', label: 'Light', description: 'Always light theme' },
    { value: 'dark', label: 'Dark', description: 'Always dark theme' },
  ]

  const handleDeleteAccount = async () => {
    if (!understandDeletion) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ─── APPEARANCE ─────────────────────────────── */}
      <SettingsSectionHeader title="Appearance" />
      <Text style={styles.sectionSubtitle}>Current: {mode} ({colorScheme})</Text>
      <View style={styles.card}>
        {themeOptions.map((option, index) => {
          const isSelected = mode === option.value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Theme option ${option.label}`}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.option,
                index === 0 && styles.optionFirst,
                index === themeOptions.length - 1 && styles.optionLast,
                index < themeOptions.length - 1 && styles.optionBorder,
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

      {/* ─── INTEGRATIONS ────────────────────────────── */}
      <SettingsSectionHeader title="Integrations" />
      <View style={styles.card}>
        <GeminiApiKeySection isFirst isLast={false} />
        <SettingsRow
          title="WordPress"
          subtitle="Publish notes to WordPress"
          right={<ComingSoonBadge />}
          disabled
          showChevron={false}
          isFirst={false}
          isLast
        />
      </View>

      {/* ─── DATA ────────────────────────────────────── */}
      <SettingsSectionHeader title="Data" />
      <View style={styles.card}>
        <SettingsRow
          title="Import notes"
          subtitle="Import from Markdown, HTML or JSON"
          right={<ComingSoonBadge />}
          disabled
          showChevron={false}
          isFirst
          isLast={false}
        />
        <SettingsRow
          title="Export notes"
          subtitle="Download all notes as ZIP"
          right={<ComingSoonBadge />}
          disabled
          showChevron={false}
          isFirst={false}
          isLast
        />
      </View>

      {/* ─── ACCOUNT ─────────────────────────────────── */}
      <SettingsSectionHeader title="Account" />

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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        style={({ pressed }) => [
          styles.deleteLink,
          pressed && styles.deleteLinkPressed,
        ]}
        onPress={() => setShowDeleteModal(true)}
      >
        <Text style={styles.deleteLinkText}>Delete account</Text>
      </Pressable>

      {/* ─── Delete account modal ────────────────────── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete my account</Text>

            <Text style={styles.modalDescription}>
              This will permanently delete your account and all notes. Make sure you have any backups you need before continuing.
            </Text>

            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>
                Note: Export is coming soon and is not available yet.
              </Text>
            </View>

            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setUnderstandDeletion(!understandDeletion)}
              disabled={isDeleting}
            >
              {understandDeletion ? (
                <CheckSquare size={20} color={colors.primary} />
              ) : (
                <Square size={20} color={colors.mutedForeground} />
              )}
              <Text style={styles.checkboxLabel}>
                I understand that my account and all notes will be permanently deleted.
              </Text>
            </Pressable>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.modalButtons}>
              <Button
                variant="ghost"
                onPress={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onPress={() => void handleDeleteAccount()}
                disabled={!understandDeletion || isDeleting}
                loading={isDeleting}
                style={styles.modalButton}
              >
                Delete account
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], insets: { bottom?: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: (insets.bottom ?? 0) + 32,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    // Theme options
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
    },
    optionFirst: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    optionLast: {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    optionBorder: {
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
    // Account
    signOutButton: {
      marginTop: 8,
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
    deleteLink: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 8,
    },
    deleteLinkPressed: {
      opacity: 0.7,
    },
    deleteLinkText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.destructive,
      textDecorationLine: 'underline',
    },
    // Delete modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 16,
    },
    modalDescription: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    tipContainer: {
      padding: 12,
      backgroundColor: colors.muted,
      borderRadius: 8,
      marginBottom: 20,
    },
    tipText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
      gap: 12,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
      lineHeight: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalButton: {
      flex: 1,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 12,
      marginBottom: 16,
      textAlign: 'center',
    },
  })
