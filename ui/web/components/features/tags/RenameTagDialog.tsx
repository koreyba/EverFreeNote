"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface RenameTagDialogProps {
  readonly open: boolean
  readonly tagName: string | null
  readonly existingTagNames: string[]
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirmRename: (oldTag: string, newTag: string) => Promise<boolean | string>
}

export function RenameTagDialog({
  open,
  tagName,
  existingTagNames,
  onOpenChange,
  onConfirmRename,
}: RenameTagDialogProps) {
  const [newTagName, setNewTagName] = React.useState("")
  const [mergeWarningVisible, setMergeWarningVisible] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (tagName) {
      setNewTagName(tagName)
    }
    setMergeWarningVisible(false)
    setError(null)
  }, [open, tagName])

  const trimmedNewTagName = newTagName.trim()
  const normalizedCurrentTag = tagName?.trim().toLowerCase()
  const mergesExistingTag = existingTagNames.some((existingTagName) => {
    const normalizedExistingTag = existingTagName.trim().toLowerCase()
    return normalizedExistingTag === trimmedNewTagName.toLowerCase() && normalizedExistingTag !== normalizedCurrentTag
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tagName && trimmedNewTagName && trimmedNewTagName !== tagName) {
      if (mergesExistingTag && !mergeWarningVisible) {
        setMergeWarningVisible(true)
        return
      }
      setBusy(true)
      setError(null)
      try {
        const result = await onConfirmRename(tagName, trimmedNewTagName)
        if (typeof result === 'string') setError(result)
        else if (!result) setError("The result couldn't be confirmed. Refresh notes before trying again.")
      } catch {
        setError("The result couldn't be confirmed. Refresh notes before trying again.")
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
            <DialogDescription>
              The new name will be updated in the checked, loaded notes where this tag is used.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value)
                setMergeWarningVisible(false)
              }}
              placeholder="Enter new tag name"
              aria-label="New tag name"
              autoFocus
              data-testid="rename-tag-input"
            />
            {mergeWarningVisible && mergesExistingTag && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                This name already exists. Saving will merge the two tags.
                Submit again to confirm.
              </p>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !trimmedNewTagName || trimmedNewTagName === tagName}
              data-testid="confirm-rename-tag-button"
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
