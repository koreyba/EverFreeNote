"use client"

import { useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  loading?: boolean
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteAccountDialogProps) {
  const [ack, setAck] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAck(false)
    }
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!ack || loading) return
    await onConfirm()
    setAck(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete my account</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and all notes. Please export your notes before deleting if you
            need a copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tip: use the Export option in the settings menu to download your notes before deleting your account.
          </p>
          <div className="flex items-start gap-2">
            <Checkbox
              id="ack-delete-account"
              checked={ack}
              onCheckedChange={(val) => setAck(Boolean(val))}
            />
            <label htmlFor="ack-delete-account" className="text-sm text-muted-foreground leading-snug">
              I understand that my account and all notes will be permanently deleted.
            </label>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ack || loading}
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
