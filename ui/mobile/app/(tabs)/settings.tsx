import { useMemo, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
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

  if (isAIIndexTabActive) {
    return (
      <View style={styles.container}>
        <View style={styles.shell}>
          <SettingsTabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
          <AIIndexPanel />
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.shell}>
        <SettingsTabBar tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

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
      </View>
    </ScrollView>
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
    scrollContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
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
    panelWrap: {
      gap: 14,
    },
    panel: {
      width: '100%',
    },
    panelHidden: {
      display: 'none',
    },
  })
