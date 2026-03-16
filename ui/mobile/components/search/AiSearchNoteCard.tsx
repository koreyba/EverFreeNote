import { memo, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native'
import { TagList } from '@ui/mobile/components/tags/TagList'
import { useTheme } from '@ui/mobile/providers'
import type { RagNoteGroup } from '@core/types/ragSearch'
import type { Note } from '@core/types/domain'

type AiSearchNoteCardProps = {
  group: RagNoteGroup
  onOpenInContext: (
    note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
    charOffset: number,
    chunkLength: number
  ) => void
  onTagPress?: (tag: string) => void
  onLongPress?: () => void
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (noteId: string) => void
}

type MoreFragmentsSectionProps = {
  group: RagNoteGroup
  extraChunks: RagNoteGroup['chunks']
  expanded: boolean
  selectionMode: boolean
  onToggleExpanded: () => void
  onOpenChunk: (charOffset: number, chunkLength: number) => void
  colors: ReturnType<typeof useTheme>['colors']
  styles: ReturnType<typeof createStyles>
}

function MoreFragmentsSection({
  group,
  extraChunks,
  expanded,
  selectionMode,
  onToggleExpanded,
  onOpenChunk,
  colors,
  styles,
}: MoreFragmentsSectionProps) {
  const visibleExtraChunkCount = extraChunks.length
  const hasExpandableContent = visibleExtraChunkCount > 0

  if (!hasExpandableContent && group.hiddenCount === 0) {
    return null
  }

  return (
    <View style={styles.moreSection}>
      {hasExpandableContent ? (
        <Pressable
          onPress={(event) => {
            event?.stopPropagation?.()
            onToggleExpanded()
          }}
          disabled={selectionMode}
          style={({ pressed }) => [
            styles.moreButton,
            pressed && !selectionMode && styles.moreButtonPressed,
          ]}
        >
          <Text style={styles.moreButtonText}>
            {expanded
              ? 'Hide fragments'
              : `${visibleExtraChunkCount} more fragment${visibleExtraChunkCount === 1 ? '' : 's'}`}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={16} color={colors.mutedForeground} />
          )}
        </Pressable>
      ) : null}

      {!hasExpandableContent && group.hiddenCount > 0 && (
        <Text style={styles.hiddenMatchesText}>
          +{group.hiddenCount} similar fragment{group.hiddenCount === 1 ? '' : 's'} hidden
        </Text>
      )}

      {expanded && (
        <>
          {extraChunks.map((chunk, index) => (
            <Pressable
              key={`${chunk.noteId}-${chunk.chunkIndex}`}
              testID={`ai-note-extra-chunk-${chunk.noteId}-${chunk.chunkIndex}`}
              onPress={(event) => {
                event?.stopPropagation?.()
                onOpenChunk(chunk.charOffset, chunk.content.length)
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.extraChunk,
                pressed && !selectionMode && styles.snippetCardPressed,
              ]}
            >
              <Text style={styles.snippetLabel}>Fragment {index + 2}</Text>
              <Text style={styles.extraChunkText} numberOfLines={3}>
                {chunk.content}
              </Text>
            </Pressable>
          ))}
          {group.hiddenCount > 0 && (
            <Text style={styles.hiddenMatchesText}>
              +{group.hiddenCount} similar fragment{group.hiddenCount === 1 ? '' : 's'} hidden
            </Text>
          )}
        </>
      )}
    </View>
  )
}

export const AiSearchNoteCard = memo(function AiSearchNoteCard({
  group,
  onOpenInContext,
  onTagPress,
  onLongPress,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: AiSearchNoteCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)

  const topChunk = group.chunks[0]
  const extraChunks = group.chunks.slice(1)
  const noteSnapshot = useMemo(() => ({
    id: group.noteId,
    title: group.noteTitle,
    tags: group.noteTags,
  }), [group.noteId, group.noteTags, group.noteTitle])

  const handleOpenChunk = (charOffset: number, chunkLength: number) => {
    if (selectionMode) {
      onToggleSelect?.(group.noteId)
      return
    }
    onOpenInContext(noteSnapshot, charOffset, chunkLength)
  }

  return (
    <Pressable
      testID={`ai-note-card-${group.noteId}`}
      onPress={() => {
        if (!topChunk) return
        handleOpenChunk(topChunk.charOffset, topChunk.content.length)
      }}
      onLongPress={selectionMode ? undefined : onLongPress}
      delayLongPress={400}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={selectionMode ? { checked: isSelected } : undefined}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.headerRow}>
        {selectionMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check size={13} color={colors.primaryForeground} strokeWidth={3} />}
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={2}>
            {group.noteTitle || 'Untitled'}
          </Text>
          <Text style={styles.meta}>AI match {Math.round(group.topScore * 100)}%</Text>
        </View>
      </View>

      {!!group.noteTags.length && (
        <TagList
          tags={group.noteTags}
          onTagPress={selectionMode ? undefined : onTagPress}
          maxVisible={5}
          showOverflowCount
          style={styles.tags}
        />
      )}

      {topChunk ? (
        <Pressable
          testID={`ai-note-top-chunk-${group.noteId}`}
          onPress={(event) => {
            event?.stopPropagation?.()
            handleOpenChunk(topChunk.charOffset, topChunk.content.length)
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.snippetCard,
            pressed && !selectionMode && styles.snippetCardPressed,
          ]}
        >
          <Text style={styles.snippetLabel}>Top fragment</Text>
          <Text style={styles.snippetText} numberOfLines={3}>
            {topChunk.content}
          </Text>
        </Pressable>
      ) : null}

      <MoreFragmentsSection
        group={group}
        extraChunks={extraChunks}
        expanded={expanded}
        selectionMode={selectionMode}
        onToggleExpanded={() => setExpanded((prev) => !prev)}
        onOpenChunk={handleOpenChunk}
        colors={colors}
        styles={styles}
      />
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
  cardSelected: {
    backgroundColor: colors.selectionBackground,
    borderColor: colors.selectionBorder,
  },
  cardPressed: {
    backgroundColor: colors.selectionBackground,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  tags: {
    marginTop: 10,
    marginBottom: 8,
  },
  snippetCard: {
    marginTop: 6,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  snippetCardPressed: {
    opacity: 0.86,
  },
  snippetLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.mutedForeground,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  snippetText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
  },
  moreSection: {
    marginTop: 10,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  moreButtonPressed: {
    opacity: 0.8,
  },
  moreButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.mutedForeground,
  },
  extraChunk: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  extraChunkText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
  },
  hiddenMatchesText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
})
