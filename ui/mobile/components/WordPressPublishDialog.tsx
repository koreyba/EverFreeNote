import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AlertCircle, CheckCircle2, CheckSquare, ExternalLink, Plus, RefreshCw, Square, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { WordPressExportService, WordPressBridgeError } from '@core/services/wordpressExport'
import { WordPressSettingsService } from '@core/services/wordpressSettings'
import { getPublishedTagForSite, normalizeExportTags, slugifyLatin, validateWordPressSlug } from '@core/utils/wordpress'
import { Button, Input } from '@ui/mobile/components/ui'
import { useUpdateNote } from '@ui/mobile/hooks'
import { useSupabase, useTheme } from '@ui/mobile/providers'

type WordPressPublishNote = Readonly<{
  id: string
  title: string
  description: string
  tags: string[]
}>

type WordPressPublishDialogProps = Readonly<{
  note: WordPressPublishNote
  visible: boolean
  onClose: () => void
}>

type FeedbackState =
  | { variant: 'error'; message: string }
  | { variant: 'success'; message: string; postUrl: string }
  | null

const readErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export function WordPressPublishDialog({ note, visible, onClose }: WordPressPublishDialogProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { client, user } = useSupabase()
  const exportService = useMemo(() => new WordPressExportService(client), [client])
  const settingsService = useMemo(() => new WordPressSettingsService(client), [client])
  const updateNote = useUpdateNote()

  const [title, setTitle] = useState(note.title ?? '')
  const [slug, setSlug] = useState(slugifyLatin(note.title ?? ''))
  const [tags, setTags] = useState<string[]>(normalizeExportTags(note.tags ?? []))
  const [newTag, setNewTag] = useState('')
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set())
  const [publishedTag, setPublishedTag] = useState<string | null>(null)
  const [shouldAddPublishedTag, setShouldAddPublishedTag] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setTitle(note.title ?? '')
    setSlug(slugifyLatin(note.title ?? ''))
    setTags(normalizeExportTags(note.tags ?? []))
    setNewTag('')
    setSelectedCategoryIds(new Set())
    setPublishedTag(null)
    setShouldAddPublishedTag(true)
    setFeedback(null)
    setCategoryError(null)
  }, [note.tags, note.title])

  const persistCategoryPreference = useCallback(async (ids: number[]) => {
    if (!user?.id) return

    const { error } = await client
      .from('wordpress_export_preferences')
      .upsert(
        {
          user_id: user.id,
          remembered_category_ids: ids,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      throw error
    }
  }, [client, user?.id])

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true)
    setCategoryError(null)

    try {
      const response = await exportService.getCategories()
      setCategories(response.categories)
      setSelectedCategoryIds(new Set(response.rememberedCategoryIds))
    } catch (error) {
      if (error instanceof WordPressBridgeError) {
        setCategoryError(error.message)
      } else {
        setCategoryError(error instanceof Error ? error.message : 'Failed to load categories')
      }
    } finally {
      setIsLoadingCategories(false)
    }
  }, [exportService])

  const loadPublishedTag = useCallback(async () => {
    try {
      const status = await settingsService.getStatus()
      const siteUrl = status.integration?.siteUrl ?? ''
      setPublishedTag(getPublishedTagForSite(siteUrl))
    } catch {
      setPublishedTag(null)
    }
  }, [settingsService])

  useEffect(() => {
    if (!visible) return
    resetForm()
    loadCategories().catch((error) => {
      setCategoryError(readErrorMessage(error, 'Failed to load categories'))
    })
    loadPublishedTag().catch(() => {
      setPublishedTag(null)
    })
  }, [loadCategories, loadPublishedTag, resetForm, visible])

  useEffect(() => {
    if (visible) return
    setFeedback(null)
    setCategoryError(null)
    setIsSubmitting(false)
  }, [visible])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  const commitTag = useCallback(() => {
    const candidate = newTag.trim()
    if (!candidate) return
    setTags((current) => normalizeExportTags([...current, candidate]))
    setNewTag('')
  }, [newTag])

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove))
  }, [])

  const toggleCategory = useCallback((id: number) => {
    setSelectedCategoryIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      persistCategoryPreference(Array.from(next)).catch((error) => {
        setCategoryError(readErrorMessage(error, 'Failed to save category preference'))
      })

      return next
    })
  }, [persistCategoryPreference])

  const handleOpenPost = useCallback(async () => {
    if (feedback?.variant !== 'success' || !feedback.postUrl) return
    await Linking.openURL(feedback.postUrl)
  }, [feedback])

  const handleSubmit = useCallback(async () => {
    const slugError = validateWordPressSlug(slug)
    if (slugError) {
      setFeedback({ variant: 'error', message: slugError })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const response = await exportService.exportNote({
        noteId: note.id,
        categoryIds: Array.from(selectedCategoryIds),
        tags,
        title,
        slug: slug.trim(),
        status: 'publish',
      })

      if (publishedTag && shouldAddPublishedTag) {
        const hasTag = (note.tags ?? []).some((tag) => tag.toLocaleLowerCase() === publishedTag.toLocaleLowerCase())
        if (!hasTag) {
          const nextTags = normalizeExportTags([...(note.tags ?? []), publishedTag])
          try {
            // Route through the shared mutation so updated_at advances and the
            // editor/list caches (and offline queue) stay in sync with the new tag.
            await updateNote.mutateAsync({ id: note.id, updates: { tags: nextTags } })
          } catch (error) {
            setFeedback({
              variant: 'error',
              message: `Post published, but failed to update note tag: ${readErrorMessage(error, 'unknown error')}`,
            })
            setIsSubmitting(false)
            return
          }
        }
      }

      setFeedback({
        variant: 'success',
        message: `Post published (ID: ${response.postId}).`,
        postUrl: response.postUrl,
      })
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [exportService, note.id, note.tags, publishedTag, selectedCategoryIds, shouldAddPublishedTag, slug, tags, title, updateNote])

  let categoriesContent: React.ReactNode

  if (isLoadingCategories) {
    categoriesContent = (
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>Loading categories...</Text>
      </View>
    )
  } else if (categoryError) {
    categoriesContent = (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>{categoryError}</Text>
      </View>
    )
  } else if (categories.length === 0) {
    categoriesContent = (
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderText}>No categories returned by WordPress.</Text>
      </View>
    )
  } else {
    categoriesContent = (
      <View style={styles.categoryList}>
        {categories.map((category) => {
          const selected = selectedCategoryIds.has(category.id)
          return (
            <Pressable
              key={category.id}
              accessibilityRole="checkbox"
              accessibilityLabel={`Category ${category.name}`}
              accessibilityState={{ checked: selected, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => toggleCategory(category.id)}
              style={({ pressed }) => [
                styles.categoryRow,
                selected && styles.categoryRowSelected,
                pressed && !isSubmitting ? styles.categoryRowPressed : null,
              ]}
            >
              {selected ? (
                <CheckSquare size={18} color={colors.primary} />
              ) : (
                <Square size={18} color={colors.mutedForeground} />
              )}
              <Text style={styles.categoryText}>{category.name}</Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Export to WordPress</Text>
          <Text style={styles.subtitle}>Review slug, categories, and tags, then publish.</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Untitled"
            editable={!isSubmitting}
          />

          <View style={styles.noticeCard}>
            <AlertCircle size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              Export uses the last synchronized note content. Make sure your latest edits are saved before publishing.
            </Text>
          </View>

          <Input
            label="Slug"
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="my-note-slug"
            editable={!isSubmitting}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  loadCategories().catch((error) => {
                    setCategoryError(readErrorMessage(error, 'Failed to load categories'))
                  })
                }}
                disabled={isLoadingCategories || isSubmitting}
              >
                <View style={styles.reloadButtonContent}>
                  {isLoadingCategories ? (
                    <ActivityIndicator size="small" color={colors.foreground} style={styles.inlineIcon} />
                  ) : (
                    <RefreshCw size={16} color={colors.foreground} style={styles.inlineIcon} />
                  )}
                  <Text style={styles.reloadButtonText}>Reload</Text>
                </View>
              </Button>
            </View>

            {categoriesContent}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags for export</Text>
            <View style={styles.addTagRow}>
              <Input
                containerStyle={styles.addTagInput}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add tag"
                editable={!isSubmitting}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={commitTag}
              />
              <Button variant="outline" onPress={commitTag} disabled={isSubmitting}>
                <View style={styles.addTagButtonContent}>
                  <Plus size={16} color={colors.foreground} style={styles.inlineIcon} />
                  <Text style={styles.addTagButtonText}>Add</Text>
                </View>
              </Button>
            </View>

            <View style={styles.tagsWrap}>
              {tags.length === 0 ? (
                <Text style={styles.placeholderText}>No tags</Text>
              ) : (
                tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove tag ${tag}`}
                      onPress={() => removeTag(tag)}
                      style={({ pressed }) => [styles.removeTagButton, pressed ? styles.removeTagButtonPressed : null]}
                    >
                      <X size={14} color={colors.foreground} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>

          {publishedTag ? (
            <Pressable
              accessibilityLabel="Add published tag to the note"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: shouldAddPublishedTag, disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={() => setShouldAddPublishedTag((value) => !value)}
              style={({ pressed }) => [styles.checkboxRow, pressed ? styles.checkboxRowPressed : null]}
            >
              {shouldAddPublishedTag ? (
                <CheckSquare size={18} color={colors.primary} />
              ) : (
                <Square size={18} color={colors.mutedForeground} />
              )}
              <View style={styles.checkboxCopy}>
                <Text style={styles.checkboxTitle}>Add published tag to the note</Text>
                <Text style={styles.checkboxText}>{publishedTag}</Text>
              </View>
            </Pressable>
          ) : null}

          {feedback?.variant === 'error' ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{feedback.message}</Text>
            </View>
          ) : null}

          {feedback?.variant === 'success' ? (
            <View style={styles.successCard}>
              <View style={styles.successRow}>
                <CheckCircle2 size={18} color={colors.primary} />
                <Text style={styles.successText}>{feedback.message}</Text>
              </View>
              <Button
                variant="ghost"
                onPress={() => {
                  handleOpenPost().catch((error) => {
                    setFeedback({
                      variant: 'error',
                      message: readErrorMessage(error, 'Failed to open the published post'),
                    })
                  })
                }}
              >
                <View style={styles.openPostButtonContent}>
                  <ExternalLink size={16} color={colors.foreground} style={styles.inlineIcon} />
                  <Text style={styles.openPostButtonText}>Open post</Text>
                </View>
              </Button>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Button variant="outline" onPress={handleClose} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            onPress={() => {
              handleSubmit().catch((error) => {
                setFeedback({
                  variant: 'error',
                  message: readErrorMessage(error, 'Export failed'),
                })
              })
            }}
            disabled={isSubmitting || isLoadingCategories}
          >
            {isSubmitting ? 'Exporting...' : 'Export'}
          </Button>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.42)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 16,
      maxHeight: '92%',
    },
    header: {
      gap: 4,
    },
    title: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    content: {
      marginTop: 16,
    },
    contentContainer: {
      gap: 14,
      paddingBottom: 8,
    },
    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.background,
      padding: 12,
    },
    noticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    reloadButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    reloadButtonText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    inlineIcon: {
      marginRight: 6,
    },
    placeholderCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    placeholderText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    errorCard: {
      borderWidth: 1,
      borderColor: colors.destructive,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.card,
    },
    errorText: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'Inter_400Regular',
      color: colors.destructive,
    },
    categoryList: {
      gap: 8,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    categoryRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
    },
    categoryRowPressed: {
      opacity: 0.85,
    },
    categoryText: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    addTagRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    addTagInput: {
      flex: 1,
    },
    addTagButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addTagButtonText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.background,
      minHeight: 48,
      alignItems: 'center',
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingLeft: 10,
      paddingRight: 6,
      paddingVertical: 6,
      backgroundColor: colors.card,
    },
    tagChipText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    removeTagButton: {
      borderRadius: 999,
      padding: 2,
    },
    removeTagButtonPressed: {
      opacity: 0.7,
    },
    checkboxRow: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkboxRowPressed: {
      opacity: 0.85,
    },
    checkboxCopy: {
      flex: 1,
      gap: 4,
    },
    checkboxTitle: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    checkboxText: {
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    successCard: {
      gap: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.background,
    },
    successRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    successText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    openPostButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    openPostButtonText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
    },
  })
