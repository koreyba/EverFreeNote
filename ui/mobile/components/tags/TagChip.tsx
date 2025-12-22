import React, { useMemo } from 'react'
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type GestureResponderEvent,
} from 'react-native'
import { Tag, X } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'

type TagChipProps = {
  tag: string
  onPress?: (tag: string) => void
  onRemove?: (tag: string) => void
  showIcon?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function TagChip({
  tag,
  onPress,
  onRemove,
  showIcon = false,
  style,
  textStyle,
}: TagChipProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isPressable = typeof onPress === 'function'

  const handlePress = (event: GestureResponderEvent) => {
    const nativeEvent = event as unknown as { stopPropagation?: () => void }
    nativeEvent.stopPropagation?.()
    onPress?.(tag)
  }

  const handleRemove = (event: GestureResponderEvent) => {
    const nativeEvent = event as unknown as { stopPropagation?: () => void }
    nativeEvent.stopPropagation?.()
    onRemove?.(tag)
  }

  return (
      <Pressable
      accessibilityRole={isPressable ? 'button' : undefined}
      accessibilityLabel={isPressable ? `Tag ${tag}` : undefined}
      style={({ pressed }) => [
        styles.chip,
        isPressable && pressed && styles.chipPressed,
        style,
      ]}
      onPress={isPressable ? handlePress : undefined}
    >
      <View style={styles.content}>
        {showIcon && (
          <Tag size={12} color={colors.secondaryForeground} style={styles.icon} />
        )}
        <Text style={[styles.text, textStyle]} numberOfLines={1}>
          {tag}
        </Text>
      </View>
      {onRemove && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove tag ${tag}`}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed,
          ]}
          onPress={handleRemove}
          hitSlop={6}
        >
          <X size={12} color={colors.destructive} />
        </Pressable>
      )}
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  chipPressed: {
    backgroundColor: colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.secondaryForeground,
  },
  removeButton: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonPressed: {
    backgroundColor: colors.accent,
  },
})
