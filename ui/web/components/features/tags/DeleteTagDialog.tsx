"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteTagDialogProps {
  readonly open: boolean
  readonly tagName: string | null
  readonly noteCount?: number
  readonly onOpenChange: (boolean) => void
  readonly onConfirmDelete: (string) => void
}

export function DeleteTagDialog({
  open,
  tagName,
  noteCount = 0,
  onOpenChange,
  onConfirmDelete,
}: DeleteTagDialogProps) {
  const handleConfirm = () => {
    if (tagName) {
      onConfirmDelete(tagName)
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tag &quot;{tagName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This tag will be removed from {noteCount} {noteCount === 1 ? 'note' : 'notes'}. The notes themselves will not be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            data-testid="confirm-delete-tag-button"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
