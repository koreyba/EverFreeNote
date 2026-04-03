import { memo, useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'

import {
  AI_INDEX_STATUS_LABELS,
  AI_INDEX_STATUS_DESCRIPTIONS,
  getAIIndexActionPresentation,
} from '@core/constants/aiIndex'
import { parseRagIndexResult } from '@core/rag/indexResult'
import type { AIIndexMutationResult, AIIndexNoteRow } from '@core/types/aiIndex'
import { Badge } from '@ui/mobile/components/ui/Badge'
import { Button } from '@ui/mobile/components/ui/Button'
import { useSupabase, useTheme } from '@ui/mobile/providers'

type Operation = 'indexing' | 'deleting' | null

type Props = Readonly<{
  note: AIIndexNoteRow
  onMutated: (result: AIIndexMutationResult) => void
}>

function getStatusBadgeStyle(
  status: AIIndexNoteRow['status'],
  colors: ReturnType<typeof useTheme>['colors'],
) {
  if (status === 'indexed') {
    return {
      bg: {
        backgroundColor: 'rgba(22,163,74,0.1)',
        borderColor: 'rgba(22,163,74,0.3)',
      },
      text: { color: '#16a34a' },
    }
  }

  if (status === 'outdated') {
    return {
      bg: {
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.3)',
      },
      text: { color: '#f59e0b' },
    }
  }

  return {
    bg: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    text: { color: colors.mutedForeground },
  }
}

export const AIIndexNoteCard = memo(function AIIndexNoteCard({ note, onMutated }: Props) {
  const { client: supabase } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [operation, setOperation] = useState<Operation>(null)

  const isBusy = operation !== null
  const indexAction = getAIIndexActionPresentation(note.status)
  const statusBadgeStyle = useMemo(
    () => getStatusBadgeStyle(note.status, colors),
    [note.status, colors],
  )

  const handleIndex = useCallback(async () => {
    setOperation('indexing')
    try {
      const { data, error } = await supabase.functions.invoke('rag-index', {
        body: { noteId: note.id, action: indexAction.action },
      })
      if (error) throw error

      const result = parseRagIndexResult(data)
      if (result.outcome === 'indexed') {
        Toast.show({ type: 'success', text1: indexAction.successToast })
        onMutated({
          noteId: note.id,
          previousStatus: note.status,
          nextStatus: indexAction.successStatus,
        })
        return
      }
      if (result.outcome === 'skipped') {
        Toast.show({ type: 'error', text1: result.message ?? 'Indexing was skipped.' })
        if (result.reason === 'too_short') {
          onMutated({ noteId: note.id, previousStatus: note.status, nextStatus: 'not_indexed' })
        }
        return
      }
      Toast.show({ type: 'error', text1: result.message ?? 'Unexpected response.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${indexAction.label} failed`
      Toast.show({ type: 'error', text1: msg })
    } finally {
      setOperation(null)
    }
  }, [indexAction, note.id, note.status, onMutated, supabase.functions])

  const handleDelete = useCallback(async () => {
    setOperation('deleting')
    try {
      const { data, error } = await supabase.functions.invoke('rag-index', {
        body: { noteId: note.id, action: 'delete' },
      })
      if (error) throw error

      const result = parseRagIndexResult(data)
      if (result.outcome === 'deleted') {
        Toast.show({ type: 'success', text1: 'Note removed from AI index' })
        onMutated({ noteId: note.id, previousStatus: note.status, nextStatus: 'not_indexed' })
        return
      }
      Toast.show({ type: 'error', text1: result.message ?? 'Unexpected response.' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Remove from index failed'
      Toast.show({ type: 'error', text1: msg })
    } finally {
      setOperation(null)
    }
  }, [note.id, note.status, onMutated, supabase.functions])

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>
        {note.title.trim() || 'Untitled Note'}
      </Text>

      <View style={styles.statusRow}>
        <Badge
          variant="outline"
          style={{ ...statusBadgeStyle.bg, borderWidth: 1 }}
          textStyle={statusBadgeStyle.text}
        >
          {AI_INDEX_STATUS_LABELS[note.status]}
        </Badge>
        <Text style={styles.statusDescription}>{AI_INDEX_STATUS_DESCRIPTIONS[note.status]}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          variant={indexAction.buttonVariant}
          size="sm"
          loading={operation === 'indexing'}
          disabled={isBusy}
          onPress={() => { void handleIndex() }}
          style={styles.actionButton}
        >
          {indexAction.label}
        </Button>

        {indexAction.action === 'reindex' ? (
          <Button
            variant="outline"
            size="sm"
            loading={operation === 'deleting'}
            disabled={isBusy}
            onPress={() => { void handleDelete() }}
            style={styles.actionButton}
            textStyle={{ color: colors.destructive }}
          >
            Remove index
          </Button>
        ) : null}
      </View>
    </View>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      gap: 10,
    },
    title: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      lineHeight: 20,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusDescription: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      flex: 1,
    },
    actions: {
      flexDirection: 'column',
      gap: 8,
    },
    actionButton: {
      flex: 1,
    },
  })
