import { Pressable, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { useTheme } from '@ui/mobile/providers'
import { useMemo } from 'react'
import type { Note } from '@core/types/domain'

interface NoteCardProps {
  note: Note
  onPress: () => void
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const description = (note.description ?? '').replace(/<[^>]*>/g, '')

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
      {description.length > 0 && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}
      <Text style={styles.date}>
        {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm')}
      </Text>
    </Pressable>
  )
}

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
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
})
