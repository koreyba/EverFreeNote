import React, { useMemo } from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '@ui/mobile/providers'
import { Button } from '@ui/mobile/components/ui'
import { TagChip } from './TagChip'

type TagFilterBarProps = {
  tag: string | null
  onClear: () => void
  style?: ViewStyle
}

export function TagFilterBar({ tag, onClear, style }: TagFilterBarProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (!tag) return null

  return (
    <View style={[styles.container, style]}>
      <TagChip tag={tag} showIcon />
      <Button
        variant="ghost"
        size="sm"
        onPress={onClear}
        style={styles.clearButton}
        textStyle={styles.clearButtonText}
      >
        Clear Tags
      </Button>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  clearButton: {
    paddingHorizontal: 8,
  },
  clearButtonText: {
    color: colors.foreground,
  },
})
