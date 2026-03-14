import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AccountSettingsPanel } from '@ui/mobile/components/settings/AccountSettingsPanel'
import { ApiKeysSettingsPanel } from '@ui/mobile/components/settings/ApiKeysSettingsPanel'
import { EnexExportPanel } from '@ui/mobile/components/settings/EnexExportPanel'
import { EnexImportPanel } from '@ui/mobile/components/settings/EnexImportPanel'
import {
  SettingsTabBar,
  type SettingsTabDefinition,
  type SettingsTabKey,
} from '@ui/mobile/components/settings/SettingsTabBar'
import { WordPressSettingsPanel } from '@ui/mobile/components/settings/WordPressSettingsPanel'
import { useAuth, useSupabase, useTheme } from '@ui/mobile/providers'

const tabs: SettingsTabDefinition[] = [
  { key: 'account', label: 'My Account' },
  { key: 'import', label: 'Import .enex file' },
  { key: 'export', label: 'Export .enex file' },
  { key: 'wordpress', label: 'WordPress settings' },
  { key: 'apiKeys', label: 'API Keys' },
]

export default function SettingsScreen() {
  const { colors, mode, setMode, colorScheme } = useTheme()
  const { signOut, deleteAccount } = useAuth()
  const { user } = useSupabase()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, insets.bottom ?? 0), [colors, insets.bottom])
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('account')

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Everything for your account, imports, exports, and integrations.</Text>
        </View>

        <SettingsTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <View style={styles.panelWrap}>
          {activeTab === 'account' ? (
            <AccountSettingsPanel
              email={user?.email ?? 'No email available'}
              mode={mode}
              colorScheme={colorScheme}
              onModeChange={setMode}
              onSignOut={signOut}
              onDeleteAccount={deleteAccount}
            />
          ) : null}

          {activeTab === 'import' ? <EnexImportPanel /> : null}
          {activeTab === 'export' ? <EnexExportPanel /> : null}
          {activeTab === 'wordpress' ? <WordPressSettingsPanel /> : null}
          {activeTab === 'apiKeys' ? <ApiKeysSettingsPanel /> : null}
        </View>
      </View>
    </ScrollView>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: bottomInset + 24,
    },
    shell: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      gap: 16,
    },
    header: {
      gap: 6,
      paddingHorizontal: 2,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 34,
      lineHeight: 40,
    },
    subtitle: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 320,
    },
    panelWrap: {
      gap: 14,
    },
  })
