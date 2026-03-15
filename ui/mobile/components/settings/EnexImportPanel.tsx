import { useMemo, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { CheckCircle2, CheckSquare, Circle, Square, Upload } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'

import {
  DEFAULT_IMPORT_SETTINGS,
  DUPLICATE_STRATEGY_OPTIONS,
  IMPORT_SETTINGS_COPY,
} from '@core/enex/import-shared'
import type { ImportSettings } from '@core/enex/types'
import { Button } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { MobileEnexImportService } from '@ui/mobile/services/enexImport'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

type ImportProgressState =
  | { stage: 'reading' }
  | { stage: 'importing'; processed: number; total: number }
  | null

const enexPickerType = Platform.OS === 'android' ? '*/*' : ['application/xml', 'text/xml']

const isEnexFileName = (fileName: string) => /\.enex$/i.test(fileName.trim())

export function EnexImportPanel() {
  const { client, user } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [importSettings, setImportSettings] = useState<ImportSettings>(DEFAULT_IMPORT_SETTINGS)
  const [progress, setProgress] = useState<ImportProgressState>(null)
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
      setProgress({ stage: 'reading' })
      setFeedback(null)

      const summary = await new MobileEnexImportService(client).importAsset(
        asset,
        user.id,
        importSettings,
        (next) => {
          setProgress({
            stage: 'importing',
            processed: next.processed,
            total: next.total,
          })
        }
      )
      setFeedback({ variant: summary.errors > 0 ? 'error' : 'success', message: summary.message })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import .enex file',
      })
    } finally {
      setIsImporting(false)
      setProgress(null)
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

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsTitle}>{IMPORT_SETTINGS_COPY.title}</Text>

        <View style={styles.settingsSection}>
          <Text style={styles.settingsQuestion}>{IMPORT_SETTINGS_COPY.duplicateQuestion}</Text>
          <View accessibilityRole="radiogroup" style={styles.optionsList}>
            {DUPLICATE_STRATEGY_OPTIONS.map((option) => {
              const checked = importSettings.duplicateStrategy === option.value

              return (
                <Button
                  key={option.value}
                  variant="ghost"
                  disabled={isImporting}
                  onPress={() =>
                    setImportSettings((current) => ({
                      ...current,
                      duplicateStrategy: option.value,
                    }))
                  }
                  style={styles.optionButton}
                  textStyle={styles.optionButtonText}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, disabled: isImporting }}
                  accessibilityLabel={option.label}
                >
                  <View style={styles.optionContent}>
                    {checked ? (
                      <CheckCircle2 size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.mutedForeground} />
                    )}
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </View>
                </Button>
              )
            })}
          </View>
        </View>

        <Button
          variant="ghost"
          disabled={isImporting}
          onPress={() =>
            setImportSettings((current) => ({
              ...current,
              skipFileDuplicates: !current.skipFileDuplicates,
            }))
          }
          style={styles.optionButton}
          textStyle={styles.optionButtonText}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: importSettings.skipFileDuplicates, disabled: isImporting }}
          accessibilityLabel={IMPORT_SETTINGS_COPY.skipFileDuplicatesLabel}
        >
          <View style={styles.optionContent}>
            {importSettings.skipFileDuplicates ? (
              <CheckSquare size={18} color={colors.primary} />
            ) : (
              <Square size={18} color={colors.mutedForeground} />
            )}
            <Text style={styles.optionLabel}>{IMPORT_SETTINGS_COPY.skipFileDuplicatesLabel}</Text>
          </View>
        </Button>
      </View>

      {isImporting ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>
            {progress?.stage === 'importing'
              ? `Importing notes ${progress.processed} / ${progress.total}...`
              : 'Reading .enex file...'}
          </Text>
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
    settingsGroup: {
      gap: 10,
    },
    settingsTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    settingsSection: {
      gap: 8,
    },
    settingsQuestion: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
    },
    optionsList: {
      gap: 8,
    },
    optionButton: {
      width: '100%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      justifyContent: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    optionButtonText: {
      textAlign: 'left',
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      flexShrink: 1,
    },
    optionLabel: {
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      flexShrink: 1,
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
