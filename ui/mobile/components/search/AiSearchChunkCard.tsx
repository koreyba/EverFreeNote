import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TagList } from '@ui/mobile/components/tags/TagList'
import { useTheme } from '@ui/mobile/providers'
import { getRagChunkBodyLength } from '@core/rag/chunkTemplate'
import type { RagChunk } from '@core/types/ragSearch'
import type { Note } from '@core/types/domain'

type AiSearchChunkCardProps = {
  chunk: RagChunk
  onOpenInContext: (
    note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
    charOffset: number,
    chunkLength: number
  ) => void
  onTagPress?: (tag: string) => void
}

export const AiSearchChunkCard = memo(function AiSearchChunkCard({
  chunk,
  onOpenInContext,
  onTagPress,
}: AiSearchChunkCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const noteTags = chunk.noteTags ?? []
  const noteSnapshot = useMemo(() => ({
    id: chunk.noteId,
    title: chunk.noteTitle,
    tags: noteTags,
  }), [chunk.noteId, chunk.noteTitle, noteTags])

  return (
    <Pressable
      testID={`ai-chunk-card-${chunk.noteId}-${chunk.chunkIndex}`}
      onPress={() => onOpenInContext(noteSnapshot, chunk.charOffset, getRagChunkBodyLength(chunk.bodyContent))}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {chunk.noteTitle || 'Untitled'}
        </Text>
        <Text style={styles.score}>{Math.round(chunk.similarity * 100)}%</Text>
      </View>

      {noteTags.length > 0 && (
        <TagList
          tags={noteTags}
          onTagPress={onTagPress}
          maxVisible={4}
          showOverflowCount
          style={styles.tags}
        />
      )}

      <Text style={styles.snippet} numberOfLines={4}>
        {chunk.bodyContent}
      </Text>
    </Pressable>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  score: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  tags: {
    marginTop: 10,
    marginBottom: 8,
  },
  snippet: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
  },
})
