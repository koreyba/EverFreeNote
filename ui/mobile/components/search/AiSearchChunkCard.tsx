import { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TagList } from '@ui/mobile/components/tags/TagList'
import { useTheme } from '@ui/mobile/providers'
import type { RagChunk } from '@core/types/ragSearch'

type AiSearchChunkCardProps = {
  chunk: RagChunk
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  onTagPress?: (tag: string) => void
}

export const AiSearchChunkCard = memo(function AiSearchChunkCard({
  chunk,
  onOpenInContext,
  onTagPress,
}: AiSearchChunkCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable
      testID={`ai-chunk-card-${chunk.noteId}-${chunk.chunkIndex}`}
      onPress={() => onOpenInContext(chunk.noteId, chunk.charOffset, chunk.content.length)}
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

      {!!chunk.noteTags.length && (
        <TagList
          tags={chunk.noteTags}
          onTagPress={onTagPress}
          maxVisible={4}
          showOverflowCount
          style={styles.tags}
        />
      )}

      <Text style={styles.snippet} numberOfLines={4}>
        {chunk.content}
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
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
