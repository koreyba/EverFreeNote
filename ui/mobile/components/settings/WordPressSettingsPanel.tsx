import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CheckSquare, Globe, Square } from 'lucide-react-native'

import { WordPressSettingsService } from '@core/services/wordpressSettings'
import { Button, Input } from '@ui/mobile/components/ui'
import { useSupabase, useTheme } from '@ui/mobile/providers'
import { SettingsPanelCard } from './SettingsPanelCard'
import { SettingsStatusMessage } from './SettingsStatusMessage'

type FeedbackState =
  | { variant: 'error' | 'success' | 'info'; message: string }
  | null

const normalizeSiteUrl = (value: string) => value.trim().replace(/\/+$/, '')

export function WordPressSettingsPanel() {
  const { client } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [siteUrl, setSiteUrl] = useState('')
  const [wpUsername, setWpUsername] = useState('')
  const [applicationPassword, setApplicationPassword] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [hasPassword, setHasPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const isBusy = isLoading || isSaving

  useEffect(() => {
    let isMounted = true
    const service = new WordPressSettingsService(client)

    void (async () => {
      try {
        const status = await service.getStatus()
        if (!isMounted) return

        setSiteUrl(status.integration?.siteUrl ?? '')
        setWpUsername(status.integration?.wpUsername ?? '')
        setEnabled(status.integration?.enabled ?? true)
        setHasPassword(status.integration?.hasPassword ?? false)
        setFeedback(
          status.integration
            ? {
                variant: 'info',
                message: status.integration.hasPassword
                  ? 'Saved WordPress credentials are available.'
                  : 'Enter an application password to complete setup.',
              }
            : null
        )
      } catch (error) {
        if (!isMounted) return
        setFeedback({
          variant: 'error',
          message: error instanceof Error ? error.message : 'Failed to load WordPress settings',
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
    const normalizedUrl = normalizeSiteUrl(siteUrl)
    const trimmedUsername = wpUsername.trim()
    const trimmedPassword = applicationPassword.trim()

    if (!normalizedUrl) {
      setFeedback({ variant: 'error', message: 'Site URL is required.' })
      return
    }

    if (!trimmedUsername) {
      setFeedback({ variant: 'error', message: 'WordPress username is required.' })
      return
    }

    if (!hasPassword && !trimmedPassword) {
      setFeedback({
        variant: 'error',
        message: 'Application password is required for the initial setup.',
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const status = await new WordPressSettingsService(client).upsert({
        siteUrl: normalizedUrl,
        wpUsername: trimmedUsername,
        applicationPassword: trimmedPassword || undefined,
        enabled,
      })

      setSiteUrl(status.integration?.siteUrl ?? normalizedUrl)
      setWpUsername(status.integration?.wpUsername ?? trimmedUsername)
      setEnabled(status.integration?.enabled ?? enabled)
      setHasPassword(status.integration?.hasPassword ?? (hasPassword || Boolean(trimmedPassword)))
      setApplicationPassword('')
      setFeedback({ variant: 'success', message: 'WordPress settings saved successfully.' })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to save WordPress settings',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsPanelCard
      icon={<Globe size={20} color={colors.foreground} />}
      title="WordPress settings"
      subtitle="Site URL, account, and publishing access."
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading WordPress settings...</Text>
        </View>
      ) : null}

      <Input
        label="Site URL"
        value={siteUrl}
        onChangeText={setSiteUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://example.com"
        editable={!isBusy}
      />

      <Input
        label="WordPress username"
        value={wpUsername}
        onChangeText={setWpUsername}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="editor-user"
        editable={!isBusy}
      />

      <Input
        label={hasPassword ? 'Application password (optional)' : 'Application password'}
        value={applicationPassword}
        onChangeText={setApplicationPassword}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="xxxx xxxx xxxx xxxx"
        editable={!isBusy}
      />

      <Pressable
        accessibilityLabel="Enable WordPress publishing"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: enabled }}
        disabled={isBusy}
        onPress={() => setEnabled((value) => !value)}
        style={({ pressed }) => [styles.checkboxRow, pressed && styles.checkboxRowPressed]}
      >
        {enabled ? (
          <CheckSquare size={18} color={colors.primary} />
        ) : (
          <Square size={18} color={colors.mutedForeground} />
        )}
        <View style={styles.checkboxCopy}>
          <Text style={styles.checkboxTitle}>Enable WordPress publishing</Text>
          <Text style={styles.checkboxText}>
            When enabled, your saved credentials can be used for publishing actions.
          </Text>
        </View>
      </Pressable>

      {feedback ? <SettingsStatusMessage message={feedback.message} variant={feedback.variant} /> : null}

      <Button onPress={() => void handleSave()} loading={isSaving} disabled={isBusy}>
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
    checkboxRow: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkboxRowPressed: {
      opacity: 0.85,
    },
    checkboxCopy: {
      flex: 1,
      gap: 4,
    },
    checkboxTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    checkboxText: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 20,
    },
  })
