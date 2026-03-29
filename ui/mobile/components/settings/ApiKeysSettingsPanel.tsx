import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react-native'

import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import {
  RAG_SEARCH_EDITABLE_DEFAULTS,
  resolveRagSearchSettings,
  validateRagSearchEditableSettings,
  type RagSearchSettings,
} from '@core/rag/searchSettings'
import { RagSearchSettingsService } from '@core/services/ragSearchSettings'
import { Button, Input } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

export function ApiKeysSettingsPanel() {
  const { client } = useSupabase()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const apiKeysService = useMemo(() => new ApiKeysSettingsService(client), [client])
  const ragSearchSettingsService = useMemo(() => new RagSearchSettingsService(client), [client])

  const [value, setValue] = useState('')
  const [configured, setConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isRemovingKey, setIsRemovingKey] = useState(false)
  const [isSavingRetrieval, setIsSavingRetrieval] = useState(false)
  const [keyFeedback, setKeyFeedback] = useState<FeedbackState>(null)
  const [retrievalFeedback, setRetrievalFeedback] = useState<FeedbackState>(null)
  const [resolvedRagSearchSettings, setResolvedRagSearchSettings] = useState<RagSearchSettings | null>(null)
  const [topKValue, setTopKValue] = useState(String(RAG_SEARCH_EDITABLE_DEFAULTS.top_k))

  const displayRagSearchSettings = resolvedRagSearchSettings ?? resolveRagSearchSettings(null)
  const canEditRetrieval = !isLoading && resolvedRagSearchSettings !== null

  const validationErrors = useMemo(() => (
    validateRagSearchEditableSettings({
      top_k: Number(topKValue),
      similarity_threshold: displayRagSearchSettings.similarity_threshold,
    })
  ), [displayRagSearchSettings.similarity_threshold, topKValue])

  useEffect(() => {
    let isMounted = true

    void (async () => {
      try {
        const status = await apiKeysService.getStatus()
        if (!isMounted) return

        const ragSearchSettings = status.ragSearch ?? resolveRagSearchSettings(null)
        setConfigured(status.gemini.configured)
        setResolvedRagSearchSettings(ragSearchSettings)
        setTopKValue(String(ragSearchSettings.top_k))
        setKeyFeedback(
          status.gemini.configured
            ? { variant: 'info', message: 'A Gemini API key is already stored securely.' }
            : null
        )
        setRetrievalFeedback(null)
      } catch (error) {
        if (!isMounted) return

        setKeyFeedback({
          variant: 'error',
          message: error instanceof Error ? error.message : 'Failed to load API key settings',
        })
        setRetrievalFeedback({
          variant: 'info',
          message: 'Showing default retrieval values until live settings can be loaded from the server.',
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [apiKeysService])

  const syncQueryCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ['apiKeysStatus'] })
  }

  const handleSaveKey = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setKeyFeedback({
        variant: configured ? 'info' : 'error',
        message: configured ? 'No changes to save.' : 'Enter a Gemini API key to continue.',
      })
      return
    }

    setIsSavingKey(true)
    setKeyFeedback(null)

    try {
      const status = await apiKeysService.upsert(trimmed)
      const ragSearchSettings = status.ragSearch ?? displayRagSearchSettings

      setConfigured(status.gemini.configured)
      setResolvedRagSearchSettings(ragSearchSettings)
      setTopKValue(String(ragSearchSettings.top_k))
      setValue('')
      setKeyFeedback({ variant: 'success', message: 'Gemini API key saved successfully.' })
      syncQueryCaches()
    } catch (error) {
      setKeyFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to save API key',
      })
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleRemoveKey = async () => {
    if (!configured) return

    setIsRemovingKey(true)
    setKeyFeedback(null)

    try {
      const status = await apiKeysService.removeGeminiApiKey()
      const ragSearchSettings = status.ragSearch ?? displayRagSearchSettings

      setConfigured(status.gemini.configured)
      setResolvedRagSearchSettings(ragSearchSettings)
      setTopKValue(String(ragSearchSettings.top_k))
      setValue('')
      setKeyFeedback({ variant: 'success', message: 'Gemini API key removed.' })
      syncQueryCaches()
    } catch (error) {
      setKeyFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to remove API key',
      })
    } finally {
      setIsRemovingKey(false)
    }
  }

  const handleSaveRetrieval = async () => {
    if (!canEditRetrieval || validationErrors.length > 0) return

    setIsSavingRetrieval(true)
    setRetrievalFeedback(null)

    try {
      const status = await ragSearchSettingsService.upsert({
        top_k: Number(topKValue),
      })
      setResolvedRagSearchSettings(status)
      setTopKValue(String(status.top_k))
      setRetrievalFeedback({ variant: 'success', message: 'RAG retrieval settings saved.' })
      syncQueryCaches()
    } catch (error) {
      setRetrievalFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to save RAG retrieval settings',
      })
    } finally {
      setIsSavingRetrieval(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<KeyRound size={20} color={colors.foreground} />}
      title="Indexing (RAG)"
      subtitle="Gemini API key plus AI retrieval settings."
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading indexing settings...</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gemini API key</Text>
        <Text style={styles.sectionBody}>
          Store the Gemini API key used for note indexing and AI search.
        </Text>

        <Input
          label="Gemini API Key"
          value={value}
          onChangeText={(next) => {
            setValue(next)
            if (keyFeedback?.variant === 'error') {
              setKeyFeedback(null)
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={configured ? 'Leave empty to keep current key' : 'AIzaSy...'}
          secureTextEntry
          disabled={isLoading || isSavingKey || isRemovingKey}
        />

        {keyFeedback ? <SettingsStatusMessage message={keyFeedback.message} variant={keyFeedback.variant} /> : null}

        <View style={styles.actionsRow}>
          <Button
            style={styles.actionButton}
            onPress={() => void handleSaveKey()}
            loading={isSavingKey}
            disabled={isLoading || isSavingKey || isRemovingKey}
          >
            Save API key
          </Button>
          <Button
            style={styles.actionButton}
            variant="destructive"
            onPress={() => void handleRemoveKey()}
            loading={isRemovingKey}
            disabled={!configured || isLoading || isSavingKey || isRemovingKey}
          >
            Remove key
          </Button>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RAG retrieval</Text>
        <Text style={styles.sectionBody}>
          Configure how many semantic search candidates are requested per page. Precision is adjusted directly from the search screen.
        </Text>

        <Input
          label="Top K per page"
          value={topKValue}
          onChangeText={(next) => {
            setTopKValue(next)
            if (retrievalFeedback?.variant === 'error') {
              setRetrievalFeedback(null)
            }
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="15"
          disabled={!canEditRetrieval || isSavingRetrieval}
        />

        {validationErrors.length > 0 ? (
          <SettingsStatusMessage message={validationErrors.join('. ')} variant="error" />
        ) : null}

        {!resolvedRagSearchSettings && retrievalFeedback?.variant === 'info' ? (
          <SettingsStatusMessage message={retrievalFeedback.message} variant={retrievalFeedback.variant} />
        ) : null}

        <View style={styles.readonlyGrid}>
          <ReadOnlySetting
            label="Current precision threshold"
            value={displayRagSearchSettings.similarity_threshold.toFixed(2)}
            hint="Change this from the Precision slider in AI search."
          />
          <ReadOnlySetting
            label="Vector dimensions"
            value={String(displayRagSearchSettings.output_dimensionality)}
            hint="Embedding vector size."
          />
          <ReadOnlySetting
            label="Document task type"
            value={displayRagSearchSettings.task_type_document}
            hint="Used when embedding indexed note chunks."
          />
          <ReadOnlySetting
            label="Query task type"
            value={displayRagSearchSettings.task_type_query}
            hint="Used when embedding search queries."
          />
          <ReadOnlySetting
            label="Load more overfetch"
            value={`+${displayRagSearchSettings.load_more_overfetch}`}
            hint="Used to detect more backend results."
          />
          <ReadOnlySetting
            label="Retrieval max cap"
            value={String(displayRagSearchSettings.max_top_k)}
            hint="Upper bound for the cumulative AI search result window."
          />
        </View>

        {retrievalFeedback && retrievalFeedback.variant !== 'info' ? (
          <SettingsStatusMessage message={retrievalFeedback.message} variant={retrievalFeedback.variant} />
        ) : null}

        <Button
          onPress={() => void handleSaveRetrieval()}
          loading={isSavingRetrieval}
          disabled={!canEditRetrieval || isSavingRetrieval || validationErrors.length > 0}
        >
          Save retrieval settings
        </Button>
      </View>
    </SettingsPanelCard>
  )
}

function ReadOnlySetting({
  label,
  value,
  hint,
}: Readonly<{
  label: string
  value: string
  hint?: string
}>) {
  const { colors } = useTheme()
  const styles = useMemo(() => createReadOnlyStyles(colors), [colors])

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
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
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
    },
    sectionBody: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
    },
    readonlyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
  })

const createReadOnlyStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      width: '48%',
      minWidth: 140,
      flexGrow: 1,
      gap: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    label: {
      fontSize: 11,
      lineHeight: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
    },
    value: {
      fontSize: 14,
      lineHeight: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    hint: {
      fontSize: 11,
      lineHeight: 16,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
  })
