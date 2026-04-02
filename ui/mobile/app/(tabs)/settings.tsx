import { useMemo, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AccountSettingsPanel } from '@ui/mobile/components/settings/AccountSettingsPanel'
import { AIIndexPanel } from '@ui/mobile/components/settings/AIIndexPanel'
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
  { key: 'apiKeys', label: 'Indexing (RAG)' },
  { key: 'aiIndex', label: 'AI Index' },
]

type CachedSettingsTabKey = Exclude<SettingsTabKey, 'aiIndex'>

const initialVisitedTabs: Record<CachedSettingsTabKey, boolean> = {
  account: true,
  import: false,
  export: false,
  wordpress: false,
  apiKeys: false,
}

type PanelConfig = {
  key: CachedSettingsTabKey
  isVisited: boolean
  content: ReactNode
}

const getPanelAccessibilityProps = (isActive: boolean) => ({
  accessibilityElementsHidden: !isActive,
  importantForAccessibility: isActive
    ? ('auto' as const)
    : ('no-hide-descendants' as const),
})

function SettingsPanel({
  isActive,
  content,
  styles,
}: Readonly<{
  isActive: boolean
  content: ReactNode
  styles: ReturnType<typeof createStyles>
}>) {
  return (
    <View
      {...getPanelAccessibilityProps(isActive)}
      style={[styles.panel, !isActive && styles.panelHidden]}
    >
      {content}
    </View>
  )
}

export default function SettingsScreen() {
  const { colors, mode, setMode, colorScheme } = useTheme()
  const { signOut, deleteAccount } = useAuth()
  const { user } = useSupabase()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors, insets.bottom ?? 0), [colors, insets.bottom])
  const [activeTab, setActiveTab] = useState<SettingsTabKey>('account')
  const [visitedTabs, setVisitedTabs] = useState(initialVisitedTabs)
  const isAIIndexTabActive = activeTab === 'aiIndex'

  const handleTabChange = (tab: SettingsTabKey) => {
    setActiveTab(tab)
    if (tab === 'aiIndex') return
    setVisitedTabs((current) => (current[tab] ? current : { ...current, [tab]: true }))
  }

  const panelConfigs: PanelConfig[] = [
    {
      key: 'account',
      isVisited: visitedTabs.account,
      content: (
        <AccountSettingsPanel
          email={user?.email ?? 'No email available'}
          mode={mode}
          colorScheme={colorScheme}
          onModeChange={setMode}
          onSignOut={signOut}
          onDeleteAccount={deleteAccount}
        />
      ),
    },
    {
      key: 'import',
      isVisited: visitedTabs.import,
      content: <EnexImportPanel />,
    },
    {
      key: 'export',
      isVisited: visitedTabs.export,
      content: <EnexExportPanel />,
    },
    {
      key: 'wordpress',
      isVisited: visitedTabs.wordpress,
      content: <WordPressSettingsPanel />,
    },
    {
      key: 'apiKeys',
      isVisited: visitedTabs.apiKeys,
      content: <ApiKeysSettingsPanel />,
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Everything for your account, imports, exports, and integrations.</Text>
        </View>

        <SettingsTabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        {isAIIndexTabActive ? (
          <View style={styles.aiIndexViewport}>
            <AIIndexPanel />
          </View>
        ) : (
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.panelWrap}>
              {panelConfigs.map((panel) =>
                panel.isVisited ? (
                  <SettingsPanel
                    key={panel.key}
                    isActive={activeTab === panel.key}
                    content={panel.content}
                    styles={styles}
                  />
                ) : null
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], bottomInset: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: bottomInset + 24,
    },
    shell: {
      flex: 1,
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
    panelScroll: {
      flex: 1,
    },
    panelScrollContent: {
      paddingBottom: 4,
    },
    panel: {
      width: '100%',
    },
    panelHidden: {
      display: 'none',
    },
    aiIndexViewport: {
      flex: 1,
      minHeight: 420,
    },
  })
