import React, { useMemo, useState, useRef } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, type ViewStyle } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useTheme } from '@ui/mobile/providers'
import { TagChip } from './TagChip'

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
  placeholder = 'Add tags using button on the right side:',
  disabled = false,
  style,
}: TagInputProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<TextInput>(null)

  const handleAdd = () => {
    const parsed = parseTags(draft)
    if (parsed.length > 0) {
      const nextTags = dedupeTags([...tags, ...parsed])
      onChangeTags(nextTags)
    }
    setDraft('')
    setIsEditing(false)
  }

  const handleRemove = (tagToRemove: string) => {
    const nextTags = tags.filter((tag) => tag !== tagToRemove)
    onChangeTags(nextTags)
  }

  const handleStartEditing = () => {
    if (disabled) return
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleBlur = () => {
    if (draft.trim()) {
      handleAdd()
    } else {
      setIsEditing(false)
    }
  }

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          {tags.length === 0 && !isEditing && (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}

          {tags.map((tag, index) => (
            <TagChip
              key={`${tag}-${index}`}
              tag={tag}
              onPress={onTagPress}
              onRemove={handleRemove}
            />
          ))}

          {isEditing && (
            <View style={styles.inputChip}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={handleAdd}
                onBlur={handleBlur}
                placeholder="tag name"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </ScrollView>

        {/* Fixed add button - always visible */}
        {!isEditing && (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={handleStartEditing}
            disabled={disabled}
          >
            <Plus size={14} color={colors.primary} />
          </Pressable>
        )}
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  placeholder: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    paddingVertical: 4,
  },
  inputChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: 6,
    marginBottom: 6,
    minWidth: 80,
  },
  input: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.foreground,
    padding: 0,
    margin: 0,
    minWidth: 60,
    height: 20,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonPressed: {
    backgroundColor: colors.accent,
    borderColor: colors.primary,
  },
})
