import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { KeyRound } from 'lucide-react-native'

import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import { Button, Input } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

export function ApiKeysSettingsPanel() {
  const { client } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [value, setValue] = useState('')
  const [configured, setConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  useEffect(() => {
    let isMounted = true
    const service = new ApiKeysSettingsService(client)

    void (async () => {
      try {
        const status = await service.getStatus()
        if (!isMounted) return
        setConfigured(status.gemini.configured)
        setFeedback(
          status.gemini.configured
            ? { variant: 'info', message: 'A Gemini API key is already stored securely.' }
            : null
        )
      } catch (error) {
        if (!isMounted) return
        setFeedback({
          variant: 'error',
          message: error instanceof Error ? error.message : 'Failed to load API key settings',
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
  }, [client])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setFeedback({
        variant: configured ? 'info' : 'error',
        message: configured ? 'No changes to save.' : 'Enter a Gemini API key to continue.',
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const status = await new ApiKeysSettingsService(client).upsert(trimmed)
      setConfigured(status.gemini.configured)
      setValue('')
      setFeedback({ variant: 'success', message: 'Gemini API key saved successfully.' })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to save API key',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<KeyRound size={20} color={colors.foreground} />}
      title="API Keys"
      subtitle="External model credentials and secure storage."
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading API key status...</Text>
        </View>
      ) : null}

      <Input
        label="Gemini API Key"
        value={value}
        onChangeText={(next) => {
          setValue(next)
          if (feedback?.variant === 'error') {
            setFeedback(null)
          }
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="AIzaSy..."
        secureTextEntry
      />

      {feedback ? <SettingsStatusMessage message={feedback.message} variant={feedback.variant} /> : null}

      <Button onPress={() => void handleSave()} loading={isSaving} disabled={isLoading || isSaving}>
        Save
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
