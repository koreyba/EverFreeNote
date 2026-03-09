import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native'
import { Key, CheckCircle2, AlertCircle, X } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import { useSupabase } from '@ui/mobile/providers/SupabaseProvider'
import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import { SettingsRow } from './SettingsRow'

type GeminiApiKeySectionProps = Readonly<{
    isFirst?: boolean
    isLast?: boolean
}>

export function GeminiApiKeySection({ isFirst, isLast }: GeminiApiKeySectionProps) {
    const { colors } = useTheme()
    const { client } = useSupabase()
    const styles = useMemo(() => createStyles(colors), [colors])
    const service = useMemo(() => new ApiKeysSettingsService(client), [client])

    const [modalVisible, setModalVisible] = useState(false)
    const [geminiApiKey, setGeminiApiKey] = useState('')
    const [configured, setConfigured] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const loadRequestTokenRef = useRef(0)

    const loadStatus = useCallback(async () => {
        const requestToken = loadRequestTokenRef.current + 1
        loadRequestTokenRef.current = requestToken

        setLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)
        setGeminiApiKey('')
        setConfigured(null)
        try {
            const status = await service.getStatus()
            if (loadRequestTokenRef.current !== requestToken) return
            setConfigured(status.gemini.configured)
        } catch (err) {
            if (loadRequestTokenRef.current !== requestToken) return
            setErrorMessage(err instanceof Error ? err.message : 'Failed to load API key settings')
        } finally {
            if (loadRequestTokenRef.current === requestToken) {
                setLoading(false)
            }
        }
    }, [service])

    const openModal = () => {
        setModalVisible(true)
        void loadStatus()
    }

    const closeModal = () => {
        if (saving) return
        loadRequestTokenRef.current += 1
        setModalVisible(false)
        setLoading(false)
        setGeminiApiKey('')
        setErrorMessage(null)
        setSuccessMessage(null)
    }

    const handleSave = async () => {
        setErrorMessage(null)
        setSuccessMessage(null)
        const trimmedKey = geminiApiKey.trim()

        if (!trimmedKey && configured === null) {
            setErrorMessage('Unable to verify key status. Please retry.')
            return
        }
        if (!trimmedKey && configured === false) {
            setErrorMessage('Gemini API key is required for initial setup.')
            return
        }
        if (!trimmedKey && configured === true) {
            setSuccessMessage('No changes to save.')
            return
        }

        setSaving(true)
        try {
            await service.upsert(trimmedKey)
            setConfigured(true)
            setGeminiApiKey('')
            setSuccessMessage('API key saved successfully.')
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to save API key')
        } finally {
            setSaving(false)
        }
    }

    const renderStatusBadge = () => {
        if (loading) {
            return <ActivityIndicator size="small" color={colors.mutedForeground} />
        }
        if (configured === true) {
            return <CheckCircle2 size={18} color="#22c55e" />
        }
        return null
    }

    return (
        <>
            <SettingsRow
                title="Google / Gemini API"
                subtitle={configured === true ? 'Key configured' : configured === false ? 'Not configured' : 'Tap to check status'}
                right={renderStatusBadge()}
                onPress={openModal}
                isFirst={isFirst}
                isLast={isLast}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    style={styles.modalContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Google / Gemini API Key</Text>
                            <Pressable
                                onPress={closeModal}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.5 }]}
                            >
                                <X size={22} color={colors.foreground} />
                            </Pressable>
                        </View>

                        <Text style={styles.modalDescription}>
                            API keys are encrypted before storage and never exposed in plain text.
                        </Text>

                        {/* Status badge */}
                        {!loading && (
                            <View style={[styles.statusBadge, configured === true ? styles.statusBadgeConfigured : styles.statusBadgeEmpty]}>
                                {configured === true ? (
                                    <CheckCircle2 size={16} color="#22c55e" />
                                ) : (
                                    <Key size={16} color={colors.mutedForeground} />
                                )}
                                <Text style={[styles.statusBadgeText, configured === true ? styles.statusTextConfigured : styles.statusTextEmpty]}>
                                    {configured === true
                                        ? 'Gemini API key is configured.'
                                        : configured === false
                                          ? 'No key configured yet.'
                                          : 'Unable to determine key status.'}
                                </Text>
                            </View>
                        )}

                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        )}

                        {/* Input */}
                        {!loading && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Gemini API Key</Text>
                                <TextInput
                                    style={styles.input}
                                    value={geminiApiKey}
                                    onChangeText={setGeminiApiKey}
                                    placeholder={configured === true ? 'Leave empty to keep current key' : 'AIzaSy...'}
                                    placeholderTextColor={colors.mutedForeground}
                                    secureTextEntry
                                    autoComplete="off"
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    editable={!saving}
                                />
                                {configured === true && (
                                    <Text style={styles.inputHint}>A key is stored. Enter a new one only to replace it.</Text>
                                )}
                            </View>
                        )}

                        {/* Error message */}
                        {errorMessage && (
                            <View style={styles.messageContainer}>
                                <AlertCircle size={16} color={colors.destructive} />
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        )}

                        {/* Success message */}
                        {successMessage && (
                            <View style={[styles.messageContainer, styles.successContainer]}>
                                <CheckCircle2 size={16} color="#22c55e" />
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        )}

                        {/* Actions */}
                        {!loading && (
                            <View style={styles.actions}>
                                <Pressable
                                    style={({ pressed }) => [styles.button, styles.buttonOutline, pressed && { opacity: 0.7 }]}
                                    onPress={closeModal}
                                    disabled={saving}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close"
                                >
                                    <Text style={styles.buttonOutlineText}>Close</Text>
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [styles.button, styles.buttonPrimary, (saving || loading) && styles.buttonDisabled, pressed && !saving && { opacity: 0.85 }]}
                                    onPress={() => { void handleSave() }}
                                    disabled={saving || loading}
                                    accessibilityRole="button"
                                    accessibilityLabel={saving ? 'Saving...' : 'Save'}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonPrimaryText}>Save</Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </>
    )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        modalContainer: {
            flex: 1,
            backgroundColor: colors.background,
        },
        modalContent: {
            padding: 24,
            paddingTop: 32,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        modalTitle: {
            fontSize: 20,
            fontFamily: 'Inter_700Bold',
            color: colors.foreground,
        },
        closeButton: {
            padding: 4,
        },
        modalDescription: {
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
            color: colors.mutedForeground,
            lineHeight: 20,
            marginBottom: 20,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
            borderWidth: 1,
            marginBottom: 20,
        },
        statusBadgeConfigured: {
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
        },
        statusBadgeEmpty: {
            backgroundColor: colors.muted,
            borderColor: colors.border,
        },
        statusBadgeText: {
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
        },
        statusTextConfigured: {
            color: '#22c55e',
        },
        statusTextEmpty: {
            color: colors.mutedForeground,
        },
        loadingContainer: {
            paddingVertical: 32,
            alignItems: 'center',
        },
        inputGroup: {
            marginBottom: 16,
        },
        inputLabel: {
            fontSize: 14,
            fontFamily: 'Inter_500Medium',
            color: colors.foreground,
            marginBottom: 8,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: 'Inter_400Regular',
            color: colors.foreground,
            backgroundColor: colors.card,
        },
        inputHint: {
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
            color: colors.mutedForeground,
            marginTop: 6,
        },
        messageContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(220, 38, 38, 0.3)',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            marginBottom: 16,
        },
        successContainer: {
            borderColor: 'rgba(34, 197, 94, 0.3)',
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
        },
        errorText: {
            flex: 1,
            fontSize: 13,
            fontFamily: 'Inter_400Regular',
            color: colors.destructive,
            lineHeight: 18,
        },
        successText: {
            flex: 1,
            fontSize: 13,
            fontFamily: 'Inter_400Regular',
            color: '#22c55e',
            lineHeight: 18,
        },
        actions: {
            flexDirection: 'row',
            gap: 12,
            marginTop: 8,
        },
        button: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonOutline: {
            borderWidth: 1,
            borderColor: colors.border,
        },
        buttonPrimary: {
            backgroundColor: colors.primary,
        },
        buttonDisabled: {
            opacity: 0.5,
        },
        buttonOutlineText: {
            fontSize: 15,
            fontFamily: 'Inter_500Medium',
            color: colors.foreground,
        },
        buttonPrimaryText: {
            fontSize: 15,
            fontFamily: 'Inter_500Medium',
            color: colors.primaryForeground,
        },
    })
