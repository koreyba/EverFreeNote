"use client"

import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Plus, RefreshCw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { WordPressBridgeError, WordPressExportService } from "@core/services/wordpressExport"
import { WordPressSettingsService } from "@core/services/wordpressSettings"
import { getPublishedTagForSite, normalizeExportTags, slugifyLatin, validateWordPressSlug } from "@ui/web/lib/wordpress"

type WordPressExportNote = {
  id: string
  title: string
  description: string
  tags: string[]
}

type WordPressExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: WordPressExportNote
}

export function WordPressExportDialog({ open, onOpenChange, note }: WordPressExportDialogProps) {
  const { supabase } = useSupabase()
  const exportService = React.useMemo(() => new WordPressExportService(supabase), [supabase])
  const settingsService = React.useMemo(() => new WordPressSettingsService(supabase), [supabase])

  const [categories, setCategories] = React.useState<Array<{ id: number; name: string }>>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<Set<number>>(new Set())
  const [tags, setTags] = React.useState<string[]>([])
  const [newTag, setNewTag] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [publishedTag, setPublishedTag] = React.useState<string | null>(null)
  const [shouldAddPublishedTag, setShouldAddPublishedTag] = React.useState(true)

  const [loadingCategories, setLoadingCategories] = React.useState(false)
  const [categoryError, setCategoryError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<{ postUrl: string; postId: number } | null>(null)

  const persistCategoryPreference = React.useCallback(
    async (ids: number[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("wordpress_export_preferences")
        .upsert(
          {
            user_id: user.id,
            remembered_category_ids: ids,
          },
          { onConflict: "user_id" }
        )

      if (error) {
        throw error
      }
    },
    [supabase]
  )

  const resetForm = React.useCallback(() => {
    setTitle(note.title || "")
    setTags(normalizeExportTags(note.tags ?? []))
    setNewTag("")
    setSlug(slugifyLatin(note.title || ""))
    setShouldAddPublishedTag(true)
    setErrorMessage(null)
    setCategoryError(null)
    setSuccess(null)
  }, [note.tags, note.title])

  const loadCategories = React.useCallback(async () => {
    setLoadingCategories(true)
    setCategoryError(null)

    try {
      const response = await exportService.getCategories()
      setCategories(response.categories)
      setSelectedCategoryIds(new Set(response.rememberedCategoryIds))
    } catch (error) {
      if (error instanceof WordPressBridgeError) {
        setCategoryError(error.message)
      } else {
        setCategoryError(error instanceof Error ? error.message : "Failed to load categories")
      }
    } finally {
      setLoadingCategories(false)
    }
  }, [exportService])

  const loadPublishedTag = React.useCallback(async () => {
    try {
      const status = await settingsService.getStatus()
      const siteUrl = status.integration?.siteUrl ?? ""
      setPublishedTag(getPublishedTagForSite(siteUrl))
    } catch {
      setPublishedTag(null)
    }
  }, [settingsService])

  React.useEffect(() => {
    if (!open) return
    resetForm()
    void loadCategories()
    void loadPublishedTag()
  }, [loadCategories, loadPublishedTag, open, resetForm])

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      void persistCategoryPreference(Array.from(next)).catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to save category preference"
        setCategoryError(message)
      })
      return next
    })
  }

  const commitTag = () => {
    const candidate = newTag.trim()
    if (!candidate) return

    setTags((previous) => normalizeExportTags([...previous, candidate]))
    setNewTag("")
  }

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commitTag()
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags((previous) => previous.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async () => {
    setErrorMessage(null)
    setSuccess(null)

    const slugError = validateWordPressSlug(slug)
    if (slugError) {
      setErrorMessage(slugError)
      return
    }

    setSubmitting(true)

    try {
      const response = await exportService.exportNote({
        noteId: note.id,
        categoryIds: Array.from(selectedCategoryIds),
        tags,
        title,
        slug: slug.trim(),
        status: "publish",
      })

      if (publishedTag && shouldAddPublishedTag) {
        const nextTags = normalizeExportTags([...(note.tags ?? []), publishedTag])
        const hasTag = (note.tags ?? []).some((tag) => tag.toLocaleLowerCase() === publishedTag.toLocaleLowerCase())
        if (!hasTag) {
          const { error } = await supabase
            .from("notes")
            .update({ tags: nextTags })
            .eq("id", note.id)

          if (error) {
            setErrorMessage(`Post published, but failed to update note tag: ${error.message}`)
          }
        }
      }

      setSuccess({
        postId: response.postId,
        postUrl: response.postUrl,
      })
    } catch (error) {
      if (error instanceof WordPressBridgeError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Export failed")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Export to WordPress</DialogTitle>
          <DialogDescription>
            Review slug, categories and tags, then publish.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wp-export-title">Title</Label>
            <Input
              id="wp-export-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled"
              disabled={submitting}
            />
          </div>

          <Alert className="border-amber-500/30 bg-amber-500/10 text-foreground [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Export uses the last synchronized note content from the database. Make sure your latest edits are saved
              and synced before publishing. Title, slug and tags in this dialog affect export only.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="wp-export-slug">Slug</Label>
            <Input
              id="wp-export-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="my-note-slug"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Categories</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadCategories()}
                disabled={loadingCategories || submitting}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingCategories ? "animate-spin" : ""}`} />
                Reload
              </Button>
            </div>

            {loadingCategories ? (
              <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">Loading categories...</div>
            ) : categoryError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                {categoryError}
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                No categories returned by WordPress.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border p-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={selectedCategoryIds.has(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                        disabled={submitting}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags for export</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag"
                disabled={submitting}
              />
              <Button type="button" variant="outline" onClick={commitTag} disabled={submitting}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex min-h-10 flex-wrap gap-2 rounded-md border p-2">
              {tags.length === 0 ? (
                <span className="text-sm text-muted-foreground">No tags</span>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-sm p-0.5 hover:bg-background"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {publishedTag ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="wp-add-published-tag"
                checked={shouldAddPublishedTag}
                onCheckedChange={(checked) => setShouldAddPublishedTag(Boolean(checked))}
                disabled={submitting}
              />
              <Label htmlFor="wp-add-published-tag" className="cursor-pointer">
                Add published tag to the note
              </Label>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {success ? (
            <div className="space-y-2 rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Post published (ID: {success.postId}).</span>
              </div>
              {success.postUrl ? (
                <a
                  href={success.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  Open post
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Close
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || loadingCategories}>
              {submitting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
