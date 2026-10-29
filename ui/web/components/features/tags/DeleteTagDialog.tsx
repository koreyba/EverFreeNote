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
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirmDelete: (tagName: string) => Promise<boolean | string>
}

export function DeleteTagDialog({
  open,
  tagName,
  noteCount = 0,
  onOpenChange,
  onConfirmDelete,
}: DeleteTagDialogProps) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => { if (open) setError(null) }, [open, tagName])

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault()
    if (!tagName || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await onConfirmDelete(tagName)
      if (typeof result === 'string') setError(result)
      else if (!result) setError("The result couldn't be confirmed. Refresh notes before trying again.")
    } catch {
      setError("The result couldn't be confirmed. Refresh notes before trying again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tag &quot;{tagName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This tag appears in {noteCount} loaded or cached {noteCount === 1 ? 'note' : 'notes'}. It will be removed from the checked, loaded notes. The notes themselves will not be deleted.
          </AlertDialogDescription>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={busy}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            data-testid="confirm-delete-tag-button"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
