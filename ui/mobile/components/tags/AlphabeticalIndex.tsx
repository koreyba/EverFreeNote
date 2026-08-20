import { ScrollView, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '@ui/mobile/providers'

type AlphabeticalIndexProps = Readonly<{
  letters: string[]
  selectedLetter: string | null
  onSelect: (_letter: string | null) => void
}>

export function AlphabeticalIndex({ letters, selectedLetter, onSelect }: AlphabeticalIndexProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityLabel="Alphabetical tag index"
    >
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityLabel="Show all tags"
        style={({ pressed }) => [
          styles.item,
          selectedLetter === null && styles.selected,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.text, selectedLetter === null && styles.selectedText]}>All</Text>
      </Pressable>
      {letters.map((letter) => (
        <Pressable
          key={letter}
          onPress={() => onSelect(letter)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedLetter === letter }}
          accessibilityLabel={`Show tags beginning with ${letter}`}
          style={({ pressed }) => [
            styles.item,
            selectedLetter === letter && styles.selected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.text, selectedLetter === letter && styles.selectedText]}>{letter}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 4,
  },
  item: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
  },
  selectedText: {
    color: colors.primaryForeground,
  },
})
