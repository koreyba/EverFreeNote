import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Check, Globe2, RotateCcw, Share2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PublicNoteShareService, buildPublicNoteUrl } from '@core/services/publicNoteShare'
import { useTheme } from '@ui/mobile/providers'
import { useSupabase } from '@ui/mobile/providers/SupabaseProvider'
import { getPublicWebOrigin } from '@ui/mobile/adapters'

type ShareNoteDialogProps = Readonly<{
  noteId: string
  visible: boolean
  onClose: () => void
}>

export function ShareNoteDialog({ noteId, visible, onClose }: ShareNoteDialogProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { client, user } = useSupabase()
  const service = useMemo(() => new PublicNoteShareService(client), [client])
  const [shareUrl, setShareUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shared, setShared] = useState(false)
  const autoGenerateAttemptedNoteIdRef = useRef<string | null>(null)

  useEffect(() => {
    setShareUrl('')
    setError(null)
    setShared(false)
    autoGenerateAttemptedNoteIdRef.current = null
  }, [noteId])

  const generateLink = useCallback(async () => {
    if (!user?.id) {
      setError('Sign in again to create a share link.')
      return
    }

    const origin = getPublicWebOrigin()
    if (!origin) {
      setError('Public web origin is not configured for this mobile build.')
      return
    }

    setIsLoading(true)
    setError(null)
    setShared(false)

    try {
      const link = await service.getOrCreateViewLink(noteId, user.id)
      setShareUrl(buildPublicNoteUrl(origin, link.token))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not create share link.')
    } finally {
      setIsLoading(false)
    }
  }, [noteId, service, user?.id])

  useEffect(() => {
    if (!visible) {
      autoGenerateAttemptedNoteIdRef.current = null
      return
    }

    if (shareUrl) return
    if (autoGenerateAttemptedNoteIdRef.current === noteId) return

    autoGenerateAttemptedNoteIdRef.current = noteId
    generateLink().catch(() => undefined)
  }, [generateLink, noteId, shareUrl, visible])

  useEffect(() => {
    if (visible) return

    setError(null)
    setShared(false)
  }, [visible])

  const handleNativeShare = useCallback(async () => {
    if (!shareUrl) return

    try {
      const result = await Share.share({
        title: 'Shared note',
        message: shareUrl,
        url: shareUrl,
      })
      setShared(result.action !== Share.dismissedAction)
      setError(null)
    } catch {
      setShared(false)
      setError('Could not open sharing. Select the link and copy it manually.')
    }
  }, [shareUrl])

  const handleClose = useCallback(() => {
    if (isLoading) return
    onClose()
  }, [isLoading, onClose])

  const requestLink = useCallback(() => {
    generateLink().catch(() => undefined)
  }, [generateLink])

  const requestNativeShare = useCallback(() => {
    handleNativeShare().catch(() => undefined)
  }, [handleNativeShare])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Share note</Text>
            <Text style={styles.subtitle}>Create a read-only public link for this note.</Text>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Globe2 size={18} color={colors.mutedForeground} />
          </View>
          <View style={styles.permissionText}>
            <Text style={styles.permissionTitle}>Anyone with the link can view</Text>
            <Text style={styles.permissionDescription}>Viewers can read the title, content, and tags only.</Text>
          </View>
        </View>

        <Text style={styles.label}>Public link</Text>
        <TextInput
          value={isLoading ? 'Generating link...' : shareUrl}
          editable={false}
          selectTextOnFocus
          style={styles.linkInput}
          accessibilityLabel="Public link"
          placeholder="Generating link..."
          placeholderTextColor={colors.mutedForeground}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={requestLink}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={shareUrl ? 'Get link' : 'Generate share link'}
            accessibilityState={{ disabled: isLoading }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !isLoading && styles.buttonPressed,
              isLoading && styles.disabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.foreground} style={styles.buttonIcon} />
            ) : (
              <RotateCcw size={18} color={colors.foreground} style={styles.buttonIcon} />
            )}
            <Text style={styles.secondaryButtonText}>{shareUrl ? 'Get link' : 'Generate'}</Text>
          </Pressable>

          <Pressable
            onPress={requestNativeShare}
            disabled={!shareUrl || isLoading}
            accessibilityRole="button"
            accessibilityLabel={shared ? 'Link shared' : 'Share link'}
            accessibilityState={{ disabled: !shareUrl || isLoading }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && shareUrl && !isLoading && styles.primaryButtonPressed,
              (!shareUrl || isLoading) && styles.disabled,
            ]}
          >
            {shared ? (
              <Check size={18} color={colors.primaryForeground} style={styles.buttonIcon} />
            ) : (
              <Share2 size={18} color={colors.primaryForeground} style={styles.buttonIcon} />
            )}
            <Text style={styles.primaryButtonText}>{shared ? 'Shared' : 'Share link'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  permissionCard: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.muted,
    padding: 12,
  },
  permissionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  permissionText: {
    flex: 1,
    minWidth: 0,
  },
  permissionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
  },
  permissionDescription: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.foreground,
  },
  linkInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  errorBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.destructive,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPressed: {
    backgroundColor: colors.muted,
  },
  primaryButtonPressed: {
    opacity: 0.86,
  },
  buttonIcon: {
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primaryForeground,
  },
  disabled: {
    opacity: 0.45,
  },
})
