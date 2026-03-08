import React, { useState, useMemo, useRef, useCallback } from 'react'
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native'
import { Database, Trash2 } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import { useSupabase } from '@ui/mobile/providers/SupabaseProvider'
import { useRagStatus } from '@ui/mobile/hooks/useRagStatus'

interface NoteIndexMenuProps {
    noteId: string
    visible: boolean
    onClose: () => void
}

type Operation = 'indexing' | 'deleting' | null

async function extractErrorMessage(err: unknown, fallback: string): Promise<string> {
    if (!(err instanceof Error)) return fallback
    const ctx = (err as Error & { context?: unknown }).context
    if (ctx instanceof Response) {
        try {
            const body = await ctx.json() as { error?: string }
            if (body?.error) return body.error
        } catch { /* fall through */ }
    }
    return err.message || fallback
}

export function NoteIndexMenu({ noteId, visible, onClose }: NoteIndexMenuProps) {
    const { colors } = useTheme()
    const { client } = useSupabase()
    const styles = useMemo(() => createStyles(colors), [colors])
    const { chunkCount, indexedAt, isLoading, refresh } = useRagStatus(noteId)

    const [operation, setOperation] = useState<Operation>(null)
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false)
    const [toastMessage, setToastMessage] = useState<{ text: string; isError: boolean } | null>(null)
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isIndexed = chunkCount > 0
    const isBusy = operation !== null

    const handleClose = useCallback(() => {
        // Prevent closing while an operation is in progress
        if (isBusy) return
        onClose()
    }, [isBusy, onClose])

    const showToast = useCallback((text: string, isError = false) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToastMessage({ text, isError })
        toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
    }, [])

    const handleIndex = async () => {
        setOperation('indexing')
        try {
            const action = isIndexed ? 'reindex' : 'index'
            const { data, error } = await client.functions.invoke('rag-index', {
                body: { noteId, action },
            })
            if (error) throw error
            const count = typeof (data as { chunkCount?: number })?.chunkCount === 'number'
                ? (data as { chunkCount: number }).chunkCount
                : null
            showToast(count !== null ? `Indexed into ${count} chunks` : 'Indexed successfully')
            refresh()
        } catch (err) {
            showToast(await extractErrorMessage(err, 'Indexing failed'), true)
        } finally {
            setOperation(null)
        }
    }

    const handleDelete = async () => {
        setOperation('deleting')
        setDeleteConfirmVisible(false)
        try {
            const { error } = await client.functions.invoke('rag-index', {
                body: { noteId, action: 'delete' },
            })
            if (error) throw error
            showToast('Removed from AI index')
            refresh()
        } catch (err) {
            showToast(await extractErrorMessage(err, 'Delete failed'), true)
        } finally {
            setOperation(null)
        }
    }

    const statusText = (): string => {
        if (operation === 'indexing') return 'Indexing...'
        if (operation === 'deleting') return 'Removing...'
        if (isLoading) return '...'
        if (isIndexed) {
            const time = indexedAt ? new Date(indexedAt).toLocaleTimeString() : ''
            return `${chunkCount} chunks${time ? ` · ${time}` : ''}`
        }
        return 'Not indexed'
    }

    return (
        <>
            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={handleClose}
            >
                <Pressable style={styles.overlay} onPress={handleClose} />
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>AI Index</Text>
                        {isLoading ? (
                            <ActivityIndicator size="small" color={colors.mutedForeground} style={styles.statusSpinner} />
                        ) : (
                            <Text style={styles.statusText}>{statusText()}</Text>
                        )}

                        {/* Toast */}
                        {toastMessage && (
                            <View style={[styles.toast, toastMessage.isError ? styles.toastError : styles.toastSuccess]}>
                                <Text style={styles.toastText}>{toastMessage.text}</Text>
                            </View>
                        )}

                        {/* Index / Re-index button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                pressed && !isBusy && styles.actionButtonPressed,
                                isBusy && styles.actionButtonDisabled,
                            ]}
                            onPress={() => { void handleIndex() }}
                            disabled={isBusy}
                            accessibilityRole="button"
                            accessibilityLabel={isIndexed ? 'Re-index note' : 'Index note'}
                            accessibilityState={{ disabled: isBusy }}
                        >
                            <View style={styles.actionButtonContent}>
                                {operation === 'indexing' ? (
                                    <ActivityIndicator size="small" color={colors.primary} style={styles.actionIcon} />
                                ) : (
                                    <Database size={20} color={isBusy ? colors.mutedForeground : colors.foreground} style={styles.actionIcon} />
                                )}
                                <Text style={[styles.actionButtonText, isBusy && styles.actionButtonTextDisabled]}>
                                    {isIndexed ? 'Re-index note' : 'Index note'}
                                </Text>
                            </View>
                        </Pressable>

                        {/* Remove from index button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                pressed && !isBusy && !(!isIndexed) && styles.actionButtonPressed,
                                (isBusy || !isIndexed) && styles.actionButtonDisabled,
                            ]}
                            onPress={() => setDeleteConfirmVisible(true)}
                            disabled={isBusy || !isIndexed}
                            accessibilityRole="button"
                            accessibilityLabel="Remove from index"
                            accessibilityState={{ disabled: isBusy || !isIndexed }}
                        >
                            <View style={styles.actionButtonContent}>
                                {operation === 'deleting' ? (
                                    <ActivityIndicator size="small" color={colors.destructive} style={styles.actionIcon} />
                                ) : (
                                    <Trash2 size={20} color={(isBusy || !isIndexed) ? colors.mutedForeground : colors.destructive} style={styles.actionIcon} />
                                )}
                                <Text style={[
                                    styles.actionButtonText,
                                    styles.destructiveText,
                                    (isBusy || !isIndexed) && styles.actionButtonTextDisabled,
                                ]}>
                                    Remove from index
                                </Text>
                            </View>
                        </Pressable>

                    </View>

                    {/* Cancel */}
                    <Pressable
                        style={({ pressed }) => [styles.cancelButton, pressed && !isBusy && styles.cancelButtonPressed, isBusy && styles.cancelButtonDisabled]}
                        onPress={handleClose}
                        disabled={isBusy}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                        accessibilityState={{ disabled: isBusy }}
                    >
                        <Text style={[styles.cancelText, isBusy && styles.cancelTextDisabled]}>Cancel</Text>
                    </Pressable>

                    {/* Delete confirm — rendered inside the main Modal to fix Android stacking */}
                    <Modal
                        visible={deleteConfirmVisible}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setDeleteConfirmVisible(false)}
                    >
                        <View style={styles.confirmOverlay}>
                            <View style={styles.confirmContent}>
                                <Text style={styles.confirmTitle}>Remove from AI index?</Text>
                                <Text style={styles.confirmDescription}>
                                    This will remove all embeddings for this note. You can re-index it at any time.
                                </Text>
                                <View style={styles.confirmButtons}>
                                    <Pressable
                                        style={({ pressed }) => [styles.confirmButton, styles.confirmButtonCancel, pressed && styles.confirmButtonPressed]}
                                        onPress={() => setDeleteConfirmVisible(false)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Cancel delete"
                                    >
                                        <Text style={styles.confirmButtonCancelText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        style={({ pressed }) => [styles.confirmButton, styles.confirmButtonDestructive, pressed && styles.confirmButtonPressed]}
                                        onPress={() => { void handleDelete() }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Confirm remove from index"
                                    >
                                        <Text style={styles.confirmButtonDestructiveText}>Remove</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
            </Modal>
        </>
    )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
        },
        sheet: {
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            borderTopWidth: 1,
            borderColor: colors.border,
        },
        sheetHeader: {
            alignItems: 'center',
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            marginBottom: 8,
        },
        sheetTitle: {
            fontSize: 16,
            fontFamily: 'Inter_600SemiBold',
            color: colors.foreground,
        },
        statusText: {
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
            color: colors.mutedForeground,
            marginTop: 4,
        },
        toast: {
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 8,
        },
        toastSuccess: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: '#22c55e',
        },
        toastError: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.destructive,
        },
        toastText: {
            fontSize: 13,
            fontFamily: 'Inter_400Regular',
            color: colors.foreground,
            textAlign: 'center',
        },
        actionButton: {
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginBottom: 4,
        },
        actionButtonPressed: {
            backgroundColor: colors.muted,
        },
        actionButtonDisabled: {
            opacity: 0.4,
        },
        actionButtonContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        actionIcon: {
            marginRight: 12,
        },
        actionButtonText: {
            fontSize: 16,
            fontFamily: 'Inter_500Medium',
            color: colors.foreground,
        },
        actionButtonTextDisabled: {
            color: colors.mutedForeground,
        },
        destructiveText: {
            color: colors.destructive,
        },
        cancelButton: {
            marginTop: 8,
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cancelButtonPressed: {
            backgroundColor: colors.muted,
        },
        cancelButtonDisabled: {
            opacity: 0.4,
        },
        cancelText: {
            fontSize: 16,
            fontFamily: 'Inter_500Medium',
            color: colors.mutedForeground,
        },
        cancelTextDisabled: {
            color: colors.mutedForeground,
            opacity: 0.5,
        },
        statusSpinner: {
            marginTop: 4,
        },
        // Confirm modal
        confirmOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
        },
        confirmContent: {
            width: '100%',
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
        },
        confirmTitle: {
            fontSize: 18,
            fontFamily: 'Inter_700Bold',
            color: colors.foreground,
            marginBottom: 12,
        },
        confirmDescription: {
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
            color: colors.mutedForeground,
            lineHeight: 20,
            marginBottom: 24,
        },
        confirmButtons: {
            flexDirection: 'row',
            gap: 12,
        },
        confirmButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
        },
        confirmButtonPressed: {
            opacity: 0.8,
        },
        confirmButtonCancel: {
            borderWidth: 1,
            borderColor: colors.border,
        },
        confirmButtonDestructive: {
            backgroundColor: colors.destructive,
        },
        confirmButtonCancelText: {
            fontSize: 15,
            fontFamily: 'Inter_500Medium',
            color: colors.foreground,
        },
        confirmButtonDestructiveText: {
            fontSize: 15,
            fontFamily: 'Inter_500Medium',
            color: colors.destructiveForeground,
        },
    })
