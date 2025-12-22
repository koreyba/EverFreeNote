import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { Button, Input } from '@ui/mobile/components/ui'
import { useTheme } from '@ui/mobile/providers'
import { TagList } from './TagList'

type TagInputProps = {
  tags: string[]
  onChangeTags: (tags: string[]) => void
  onTagPress?: (tag: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  style?: ViewStyle
}

const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

const dedupeTags = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

export function TagInput({
  tags,
  onChangeTags,
  onTagPress,
  label = 'Tags',
  placeholder = 'Add tags (comma-separated)',
  disabled = false,
  style,
}: TagInputProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [draft, setDraft] = useState('')

  const handleAdd = () => {
    const parsed = parseTags(draft)
    if (parsed.length === 0) return
    const nextTags = dedupeTags([...tags, ...parsed])
    onChangeTags(nextTags)
    setDraft('')
  }

  const handleRemove = (tagToRemove: string) => {
    const nextTags = tags.filter((tag) => tag !== tagToRemove)
    onChangeTags(nextTags)
  }

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TagList tags={tags} onTagPress={onTagPress} onRemoveTag={handleRemove} />
      <View style={styles.inputRow}>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          editable={!disabled}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          style={styles.input}
        />
        <Button
          variant="secondary"
          size="sm"
          onPress={handleAdd}
          disabled={disabled}
          style={styles.addButton}
          textStyle={styles.addButtonText}
        >
          Add
        </Button>
      </View>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    height: 40,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontSize: 12,
  },
})
