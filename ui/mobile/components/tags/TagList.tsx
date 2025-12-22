import React from 'react'
import { View, type ViewStyle } from 'react-native'
import { TagChip } from './TagChip'

type TagListProps = {
  tags: string[]
  onTagPress?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  maxVisible?: number
  showOverflowCount?: boolean
  showIcon?: boolean
  style?: ViewStyle
  chipStyle?: ViewStyle
}

export function TagList({
  tags,
  onTagPress,
  onRemoveTag,
  maxVisible,
  showOverflowCount = true,
  showIcon = false,
  style,
  chipStyle,
}: TagListProps) {
  if (!tags || tags.length === 0) return null

  const visibleTags = typeof maxVisible === 'number' ? tags.slice(0, maxVisible) : tags
  const hiddenCount = typeof maxVisible === 'number' ? tags.length - visibleTags.length : 0

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap' }, style]}>
      {visibleTags.map((tag, index) => (
        <TagChip
          key={`${tag}-${index}`}
          tag={tag}
          onPress={onTagPress}
          onRemove={onRemoveTag}
          showIcon={showIcon}
          style={chipStyle}
        />
      ))}
      {showOverflowCount && hiddenCount > 0 && (
        <TagChip tag={`+${hiddenCount}`} showIcon={false} style={chipStyle} />
      )}
    </View>
  )
}
