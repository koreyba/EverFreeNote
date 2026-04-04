import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react-native'

import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import {
  resolveRagIndexingSettings,
  validateRagIndexingEditableSettings,
  type RagIndexingEditableSettings,
  type RagIndexingSettings,
} from '@core/rag/indexingSettings'
import {
  RAG_SEARCH_EDITABLE_DEFAULTS,
  resolveRagSearchSettings,
  validateRagSearchEditableSettings,
  type RagSearchSettings,
} from '@core/rag/searchSettings'
import { RagIndexSettingsService } from '@core/services/ragIndexSettings'
import { RagSearchSettingsService } from '@core/services/ragSearchSettings'
import { Button, Input } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

type IndexingNumericKey =
  | 'target_chunk_size'
  | 'min_chunk_size'
  | 'max_chunk_size'
  | 'overlap'

type IndexingBooleanKey =
  | 'use_title'
  | 'use_section_headings'
  | 'use_tags'

function buildIndexingFormState(settings: RagIndexingSettings) {
  return {
    target_chunk_size: String(settings.target_chunk_size),
    min_chunk_size: String(settings.min_chunk_size),
    max_chunk_size: String(settings.max_chunk_size),
    overlap: String(settings.overlap),
    use_title: settings.use_title,
    use_section_headings: settings.use_section_headings,
    use_tags: settings.use_tags,
  }
}

function isIndexingFormPristine(
  formState: ReturnType<typeof buildIndexingFormState>,
  settings: RagIndexingSettings
) {
  return (
    formState.target_chunk_size === String(settings.target_chunk_size) &&
    formState.min_chunk_size === String(settings.min_chunk_size) &&
    formState.max_chunk_size === String(settings.max_chunk_size) &&
    formState.overlap === String(settings.overlap) &&
    formState.use_title === settings.use_title &&
    formState.use_section_headings === settings.use_section_headings &&
    formState.use_tags === settings.use_tags
  )
}

function isRetrievalTopKPristine(topKValue: string, settings: RagSearchSettings) {
  return topKValue === String(settings.top_k)
}

export function ApiKeysSettingsPanel() {
  const { client } = useSupabase()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const apiKeysService = useMemo(() => new ApiKeysSettingsService(client), [client])
  const ragIndexSettingsService = useMemo(() => new RagIndexSettingsService(client), [client])
  const ragSearchSettingsService = useMemo(() => new RagSearchSettingsService(client), [client])

  const [value, setValue] = useState('')
  const [configured, setConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [isRemovingKey, setIsRemovingKey] = useState(false)
  const [isSavingIndexing, setIsSavingIndexing] = useState(false)
  const [isSavingRetrieval, setIsSavingRetrieval] = useState(false)
  const [keyFeedback, setKeyFeedback] = useState<FeedbackState>(null)
  const [indexingFeedback, setIndexingFeedback] = useState<FeedbackState>(null)
  const [retrievalFeedback, setRetrievalFeedback] = useState<FeedbackState>(null)
  const [resolvedRagIndexingSettings, setResolvedRagIndexingSettings] = useState<RagIndexingSettings | null>(null)
  const [resolvedRagSearchSettings, setResolvedRagSearchSettings] = useState<RagSearchSettings | null>(null)
  const [indexingFormState, setIndexingFormState] = useState(() =>
    buildIndexingFormState(resolveRagIndexingSettings(null))
  )
  const [topKValue, setTopKValue] = useState(String(RAG_SEARCH_EDITABLE_DEFAULTS.top_k))
  const latestIndexingFormStateRef = useRef(indexingFormState)
  const latestTopKValueRef = useRef(topKValue)
  const latestDisplayRagIndexingSettingsRef = useRef(resolveRagIndexingSettings(null))
  const latestDisplayRagSearchSettingsRef = useRef(resolveRagSearchSettings(null))

  const displayRagIndexingSettings = resolvedRagIndexingSettings ?? resolveRagIndexingSettings(null)
  const displayRagSearchSettings = resolvedRagSearchSettings ?? resolveRagSearchSettings(null)
  const canEditIndexing = !isLoading && resolvedRagIndexingSettings !== null
  const canEditRetrieval = !isLoading && resolvedRagSearchSettings !== null

  useEffect(() => {
    latestIndexingFormStateRef.current = indexingFormState
  }, [indexingFormState])

  useEffect(() => {
    latestTopKValueRef.current = topKValue
  }, [topKValue])

  useEffect(() => {
    latestDisplayRagIndexingSettingsRef.current = displayRagIndexingSettings
  }, [displayRagIndexingSettings])

  useEffect(() => {
    latestDisplayRagSearchSettingsRef.current = displayRagSearchSettings
  }, [displayRagSearchSettings])

  const indexingValidationErrors = useMemo(() => (
    validateRagIndexingEditableSettings({
      target_chunk_size: Number(indexingFormState.target_chunk_size),
      min_chunk_size: Number(indexingFormState.min_chunk_size),
      max_chunk_size: Number(indexingFormState.max_chunk_size),
      overlap: Number(indexingFormState.overlap),
      use_title: indexingFormState.use_title,
      use_section_headings: indexingFormState.use_section_headings,
      use_tags: indexingFormState.use_tags,
    })
  ), [indexingFormState])

  const retrievalValidationErrors = useMemo(() => (
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

        const ragIndexingSettings = status.ragIndexing ?? resolveRagIndexingSettings(null)
        const ragSearchSettings = status.ragSearch ?? resolveRagSearchSettings(null)

        setConfigured(status.gemini.configured)
        setResolvedRagIndexingSettings(ragIndexingSettings)
        setResolvedRagSearchSettings(ragSearchSettings)
        setIndexingFormState(buildIndexingFormState(ragIndexingSettings))
        setTopKValue(String(ragSearchSettings.top_k))
        setKeyFeedback(
          status.gemini.configured
            ? { variant: 'info', message: 'A Gemini API key is already stored securely.' }
            : null
        )
        setIndexingFeedback(null)
        setRetrievalFeedback(null)
      } catch (error) {
        if (!isMounted) return

        setKeyFeedback({
          variant: 'error',
          message: error instanceof Error ? error.message : 'Failed to load API key settings',
        })
        setIndexingFeedback({
          variant: 'info',
          message: 'Showing default indexing values until live settings can be loaded from the server.',
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

  const syncQueryCaches = async () => {
    await queryClient.invalidateQueries({ queryKey: ['apiKeysStatus'] })
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
      const ragIndexingSettings = status.ragIndexing ?? displayRagIndexingSettings
      const ragSearchSettings = status.ragSearch ?? displayRagSearchSettings
      const shouldSyncIndexing = isIndexingFormPristine(
        latestIndexingFormStateRef.current,
        latestDisplayRagIndexingSettingsRef.current
      )
      const shouldSyncRetrieval = isRetrievalTopKPristine(
        latestTopKValueRef.current,
        latestDisplayRagSearchSettingsRef.current
      )

      setConfigured(status.gemini.configured)
      if (shouldSyncIndexing) {
        setResolvedRagIndexingSettings(ragIndexingSettings)
        setIndexingFormState(buildIndexingFormState(ragIndexingSettings))
      }
      if (shouldSyncRetrieval) {
        setResolvedRagSearchSettings(ragSearchSettings)
        setTopKValue(String(ragSearchSettings.top_k))
      }
      setValue('')
      setKeyFeedback({ variant: 'success', message: 'Gemini API key saved successfully.' })
      await syncQueryCaches()
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
      const ragIndexingSettings = status.ragIndexing ?? displayRagIndexingSettings
      const ragSearchSettings = status.ragSearch ?? displayRagSearchSettings
      const shouldSyncIndexing = isIndexingFormPristine(
        latestIndexingFormStateRef.current,
        latestDisplayRagIndexingSettingsRef.current
      )
      const shouldSyncRetrieval = isRetrievalTopKPristine(
        latestTopKValueRef.current,
        latestDisplayRagSearchSettingsRef.current
      )

      setConfigured(status.gemini.configured)
      if (shouldSyncIndexing) {
        setResolvedRagIndexingSettings(ragIndexingSettings)
        setIndexingFormState(buildIndexingFormState(ragIndexingSettings))
      }
      if (shouldSyncRetrieval) {
        setResolvedRagSearchSettings(ragSearchSettings)
        setTopKValue(String(ragSearchSettings.top_k))
      }
      setValue('')
      setKeyFeedback({ variant: 'success', message: 'Gemini API key removed.' })
      await syncQueryCaches()
    } catch (error) {
      setKeyFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to remove API key',
      })
    } finally {
      setIsRemovingKey(false)
    }
  }

  const handleIndexingNumericChange = (key: IndexingNumericKey, nextValue: string) => {
    setIndexingFormState((current) => ({ ...current, [key]: nextValue }))
    if (indexingFeedback?.variant === 'error') {
      setIndexingFeedback(null)
    }
  }

  const handleIndexingToggleChange = (key: IndexingBooleanKey, nextValue: boolean) => {
    setIndexingFormState((current) => ({ ...current, [key]: nextValue }))
    if (indexingFeedback?.variant === 'error') {
      setIndexingFeedback(null)
    }
  }

  const handleSaveIndexing = async () => {
    if (!canEditIndexing || indexingValidationErrors.length > 0) return

    setIsSavingIndexing(true)
    setIndexingFeedback(null)

    const payload: RagIndexingEditableSettings = {
      target_chunk_size: Number(indexingFormState.target_chunk_size),
      min_chunk_size: Number(indexingFormState.min_chunk_size),
      max_chunk_size: Number(indexingFormState.max_chunk_size),
      overlap: Number(indexingFormState.overlap),
      use_title: indexingFormState.use_title,
      use_section_headings: indexingFormState.use_section_headings,
      use_tags: indexingFormState.use_tags,
    }

    try {
      const status = await ragIndexSettingsService.upsert(payload)
      setResolvedRagIndexingSettings(status)
      setIndexingFormState(buildIndexingFormState(status))
      setIndexingFeedback({
        variant: 'success',
        message: 'RAG indexing settings saved. Changes apply to future indexing and future manual reindexing.',
      })
      await syncQueryCaches()
    } catch (error) {
      setIndexingFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to save RAG indexing settings',
      })
    } finally {
      setIsSavingIndexing(false)
    }
  }

  const handleSaveRetrieval = async () => {
    if (!canEditRetrieval || retrievalValidationErrors.length > 0) return

    setIsSavingRetrieval(true)
    setRetrievalFeedback(null)

    try {
      const status = await ragSearchSettingsService.upsert({
        top_k: Number(topKValue),
      })
      setResolvedRagSearchSettings(status)
      setTopKValue(String(status.top_k))
      setRetrievalFeedback({ variant: 'success', message: 'RAG retrieval settings saved.' })
      await syncQueryCaches()
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
      subtitle="Gemini API key plus indexing and retrieval settings."
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
        <Text style={styles.sectionTitle}>RAG indexing</Text>
        <Text style={styles.sectionBody}>
          Configure how future note indexing splits content into chunks. Existing indexed notes keep their current chunks until you reindex them manually.
        </Text>

        <View style={styles.formGrid}>
          <Input
            label="Minimum chunk size"
            value={indexingFormState.min_chunk_size}
            onChangeText={(next) => handleIndexingNumericChange('min_chunk_size', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            disabled={!canEditIndexing || isSavingIndexing}
            containerStyle={styles.gridField}
          />
          <Input
            label="Target chunk size"
            value={indexingFormState.target_chunk_size}
            onChangeText={(next) => handleIndexingNumericChange('target_chunk_size', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            disabled={!canEditIndexing || isSavingIndexing}
            containerStyle={styles.gridField}
          />
          <Input
            label="Maximum chunk size"
            value={indexingFormState.max_chunk_size}
            onChangeText={(next) => handleIndexingNumericChange('max_chunk_size', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            disabled={!canEditIndexing || isSavingIndexing}
            containerStyle={styles.gridField}
          />
          <Input
            label="Overlap"
            value={indexingFormState.overlap}
            onChangeText={(next) => handleIndexingNumericChange('overlap', next)}
            keyboardType="number-pad"
            inputMode="numeric"
            disabled={!canEditIndexing || isSavingIndexing}
            containerStyle={styles.gridField}
          />
        </View>

        <View style={styles.toggleList}>
          <BooleanSettingRow
            label="Use title for embeddings"
            description="Pass the note title separately to Gemini during indexing."
            value={indexingFormState.use_title}
            disabled={!canEditIndexing || isSavingIndexing}
            onValueChange={(next) => handleIndexingToggleChange('use_title', next)}
          />
          <BooleanSettingRow
            label="Use section headings"
            description="Add section headings to the indexed chunk payload when notes contain them."
            value={indexingFormState.use_section_headings}
            disabled={!canEditIndexing || isSavingIndexing}
            onValueChange={(next) => handleIndexingToggleChange('use_section_headings', next)}
          />
          <BooleanSettingRow
            label="Use tags"
            description="Append note tags to chunk content when tags are available."
            value={indexingFormState.use_tags}
            disabled={!canEditIndexing || isSavingIndexing}
            onValueChange={(next) => handleIndexingToggleChange('use_tags', next)}
          />
        </View>

        {indexingValidationErrors.length > 0 ? (
          <SettingsStatusMessage message={indexingValidationErrors.join('. ')} variant="error" />
        ) : null}

        {!resolvedRagIndexingSettings && indexingFeedback?.variant === 'info' ? (
          <SettingsStatusMessage message={indexingFeedback.message} variant={indexingFeedback.variant} />
        ) : null}

        <View style={styles.readonlyGrid}>
          <ReadOnlySetting
            label="Vector dimensions"
            value={String(displayRagIndexingSettings.output_dimensionality)}
            hint="Embedding vector size."
          />
          <ReadOnlySetting
            label="Indexing task type"
            value={displayRagIndexingSettings.task_type_document}
            hint="Used when embedding note chunks."
          />
          <ReadOnlySetting
            label="Search task type"
            value={displayRagIndexingSettings.task_type_query}
            hint="Used when embedding search queries."
          />
          <ReadOnlySetting
            label="Split strategy"
            value={displayRagIndexingSettings.split_strategy}
            hint="System-defined chunk building strategy."
          />
        </View>

        {indexingFeedback && indexingFeedback.variant !== 'info' ? (
          <SettingsStatusMessage message={indexingFeedback.message} variant={indexingFeedback.variant} />
        ) : null}

        <Button
          onPress={() => void handleSaveIndexing()}
          loading={isSavingIndexing}
          disabled={!canEditIndexing || isSavingIndexing || indexingValidationErrors.length > 0}
        >
          Save indexing settings
        </Button>
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

        {retrievalValidationErrors.length > 0 ? (
          <SettingsStatusMessage message={retrievalValidationErrors.join('. ')} variant="error" />
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
          disabled={!canEditRetrieval || isSavingRetrieval || retrievalValidationErrors.length > 0}
        >
          Save retrieval settings
        </Button>
      </View>
    </SettingsPanelCard>
  )
}

function BooleanSettingRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}: Readonly<{
  label: string
  description: string
  value: boolean
  disabled: boolean
  onValueChange: (nextValue: boolean) => void
}>) {
  const { colors } = useTheme()
  const styles = useMemo(() => createToggleStyles(colors), [colors])

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
      />
    </View>
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
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    gridField: {
      width: '48%',
      minWidth: 140,
      flexGrow: 1,
    },
    toggleList: {
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 12,
    },
    readonlyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
  })

const createToggleStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    description: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
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
