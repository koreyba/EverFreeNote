import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Download } from 'lucide-react-native'
import * as Sharing from 'expo-sharing'

import { Button } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { MobileEnexExportService } from '@ui/mobile/services/enexExport'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

export function EnexExportPanel() {
  const { client, user } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [isExporting, setIsExporting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>({
    variant: 'info',
    message: 'Export all notes to a portable .enex archive and hand it off to the native share sheet.',
  })

  const handleExport = async () => {
    if (!user) {
      setFeedback({ variant: 'error', message: 'You need to be signed in to export notes.' })
      return
    }

    setIsExporting(true)
    setFeedback(null)

    try {
      const shareAvailable = await Sharing.isAvailableAsync()
      if (!shareAvailable) {
        throw new Error('Sharing is unavailable on this device')
      }

      const result = await new MobileEnexExportService(client).exportAllNotes(user.id)
      await Sharing.shareAsync(result.fileUri, {
        mimeType: 'application/xml',
        UTI: 'public.xml',
        dialogTitle: 'Export .enex file',
      })

      setFeedback({
        variant: 'success',
        message: `Exported ${result.noteCount} note(s) to ${result.fileName}.`,
      })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to export .enex file',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<Download size={20} color={colors.foreground} />}
      title="Export .enex file"
      subtitle="Download your notes as an archive."
    >
      {isExporting ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Preparing your archive...</Text>
        </View>
      ) : null}

      {feedback ? <SettingsStatusMessage message={feedback.message} variant={feedback.variant} /> : null}

      <Button onPress={() => void handleExport()} loading={isExporting} disabled={isExporting}>
        Export and share
      </Button>
    </SettingsPanelCard>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    loader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    loaderText: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
    },
  })
