import { Pressable, StyleSheet, View } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import { Input } from '@ui/mobile/components/ui'

type TagSearchInputProps = Readonly<{
  value: string
  onChangeText: (_value: string) => void
  onClear: () => void
}>

export function TagSearchInput({ value, onChangeText, onClear }: TagSearchInputProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <View style={styles.container}>
      <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder="Search tags..."
        accessibilityLabel="Search tags"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear tag search"
          hitSlop={8}
          style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}
        >
          <X size={18} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    paddingLeft: 40,
    paddingRight: 44,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 15,
    zIndex: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  clearButtonPressed: {
    backgroundColor: colors.accent,
  },
})
