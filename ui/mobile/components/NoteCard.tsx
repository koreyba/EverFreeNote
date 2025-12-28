import { memo, useMemo } from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { useTheme } from '@ui/mobile/providers'
import { TagList } from '@ui/mobile/components/tags/TagList'
import type { Note } from '@core/types/domain'

interface NoteCardProps {
  note: Note & {
    snippet?: string | null
    headline?: string | null
  }
  onPress: () => void
  onTagPress?: (tag: string) => void
  variant?: 'list' | 'search'
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '')

const renderHighlightedText = (raw: string, styles: ReturnType<typeof createStyles>) => {
  if (!raw) return null

  const parts = raw.split(/(<mark>|<\/mark>)/g)
  let highlighted = false

  return (
    <Text style={styles.description} numberOfLines={2}>
      {parts.map((part, index) => {
        if (part === '<mark>') {
          highlighted = true
          return null
        }
        if (part === '</mark>') {
          highlighted = false
          return null
        }

        const clean = stripHtml(part)
        if (!clean) return null
        return (
          <Text key={index} style={highlighted ? styles.descriptionHighlight : undefined}>
            {clean}
          </Text>
        )
      })}
    </Text>
  )
}

export const NoteCard = memo(function NoteCard({ note, onPress, onTagPress, variant = 'list' }: NoteCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const description = stripHtml(note.description ?? '')
  const searchSnippet = note.headline ?? note.snippet ?? note.description ?? ''
  const hasSearchSnippet = stripHtml(searchSnippet).length > 0

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.title} numberOfLines={1}>
        {note.title ?? 'Без названия'}
      </Text>
      {variant === 'search' ? (
        hasSearchSnippet ? renderHighlightedText(searchSnippet, styles) : null
      ) : (
        description.length > 0 ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null
      )}
      {!!note.tags?.length && (
        <TagList
          tags={note.tags}
          onTagPress={onTagPress}
          maxVisible={5}
          showOverflowCount
          style={styles.tags}
        />
      )}
      <Text style={styles.date}>
        {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm')}
      </Text>
    </Pressable>
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
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
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 8,
    lineHeight: 20,
  },
  descriptionHighlight: {
    color: colors.primary,
    backgroundColor: colors.secondary,
    fontFamily: 'Inter_500Medium',
  },
  tags: {
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
})
