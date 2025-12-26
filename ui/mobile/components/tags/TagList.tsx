import React from 'react'
import { View, ScrollView, type ViewStyle } from 'react-native'
import { TagChip } from './TagChip'

type TagListProps = {
  tags: string[]
  onTagPress?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  maxVisible?: number
  showOverflowCount?: boolean
  showIcon?: boolean
  horizontal?: boolean
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
  horizontal = false,
  style,
  chipStyle,
}: TagListProps) {
  if (!tags || tags.length === 0) return null

  const visibleTags = typeof maxVisible === 'number' ? tags.slice(0, maxVisible) : tags
  const hiddenCount = typeof maxVisible === 'number' ? tags.length - visibleTags.length : 0

  const content = (
    <>
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
    </>
  )

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ flexDirection: 'row', alignItems: 'center' }, style]}
      >
        {content}
      </ScrollView>
    )
  }

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap' }, style]}>
      {content}
    </View>
  )
}
