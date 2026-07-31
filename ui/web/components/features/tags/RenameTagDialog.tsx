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
  open: boolean
  tagName: string | null
  onOpenChange: (open: boolean) => void
  onConfirmRename: (oldTag: string, newTag: string) => void
}

export function RenameTagDialog({
  open,
  tagName,
  onOpenChange,
  onConfirmRename,
}: RenameTagDialogProps) {
  const [newTagName, setNewTagName] = React.useState("")

  React.useEffect(() => {
    if (tagName) {
      setNewTagName(tagName)
    }
  }, [tagName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tagName && newTagName.trim() && newTagName.trim() !== tagName) {
      onConfirmRename(tagName, newTagName.trim())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
            <DialogDescription>
              The new name will be updated across all notes where this tag is used.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter new tag name"
              autoFocus
              data-testid="rename-tag-input"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newTagName.trim() || newTagName.trim() === tagName}
              data-testid="confirm-rename-tag-button"
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
