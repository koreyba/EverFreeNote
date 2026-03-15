import { useMemo, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { Upload } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'

import { Button } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { MobileEnexImportService } from '@ui/mobile/services/enexImport'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

const enexPickerType = Platform.OS === 'android' ? '*/*' : ['application/xml', 'text/xml']

const isEnexFileName = (fileName: string) => /\.enex$/i.test(fileName.trim())

export function EnexImportPanel() {
  const { client, user } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>({
    variant: 'info',
    message: 'Choose an .enex export from your device to import notes into EverFreeNote.',
  })

  const handleImport = async () => {
    if (!user) {
      setFeedback({ variant: 'error', message: 'You need to be signed in to import notes.' })
      return
    }

    try {
      // Android document providers often do not expose `.enex` exports with a stable XML MIME type.
      // Filtering by MIME there can show the file but ignore the tap, so we pick broadly and validate ourselves.
      const result = await DocumentPicker.getDocumentAsync({
        type: enexPickerType,
        copyToCacheDirectory: true,
        multiple: false,
      })

      if (result.canceled || !result.assets?.length) {
        return
      }

      const asset = result.assets[0]
      setSelectedFileName(asset.name)

      if (!isEnexFileName(asset.name)) {
        setFeedback({
          variant: 'error',
          message: 'Only Evernote .enex export files are supported.',
        })
        return
      }

      setIsImporting(true)
      setFeedback(null)

      const summary = await new MobileEnexImportService(client).importAsset(asset, user.id)
      setFeedback({ variant: summary.errors > 0 ? 'info' : 'success', message: summary.message })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import .enex file',
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<Upload size={20} color={colors.foreground} />}
      title="Import .enex file"
      subtitle="Bring notes in from Evernote exports."
    >
      <View style={styles.meta}>
        <Text style={styles.metaLabel}>Selected file</Text>
        <Text style={styles.metaValue}>{selectedFileName ?? 'No file selected yet'}</Text>
      </View>

      {isImporting ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Importing notes...</Text>
        </View>
      ) : null}

      {feedback ? <SettingsStatusMessage message={feedback.message} variant={feedback.variant} /> : null}

      <Button onPress={() => void handleImport()} loading={isImporting} disabled={isImporting}>
        Choose and import .enex
      </Button>
    </SettingsPanelCard>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    meta: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      gap: 6,
    },
    metaLabel: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.1,
    },
    metaValue: {
      color: colors.foreground,
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
    },
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
