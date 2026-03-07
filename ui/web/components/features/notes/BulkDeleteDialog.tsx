"use client"

import { useEffect, useState } from "react"
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
import { Input } from "@/components/ui/input"

type BulkDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  loading?: boolean
  errorMessage?: string | null
  onClearError?: () => void
  onConfirm: () => void
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  loading = false,
  errorMessage = null,
  onClearError,
  onConfirm,
}: BulkDeleteDialogProps) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!errorMessage) return
    setValue("")
  }, [errorMessage])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValue("")
      onClearError?.()
    }
    onOpenChange(next)
  }

  const isMatch = Number(value) === count && value.trim() !== ""

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-testid="bulk-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected notes</AlertDialogTitle>
          <AlertDialogDescription>
            This action will delete {count} notes. Type the number above into the input to confirm you really want to delete them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Enter {count} to confirm</label>
          <Input
            data-testid="bulk-delete-confirm-input"
            value={value}
            onChange={(e) => {
              if (errorMessage) {
                onClearError?.()
              }
              setValue(e.target.value)
            }}
            placeholder={`${count}`}
            type="number"
            min={0}
          />
          {errorMessage ? (
            <p data-testid="bulk-delete-error" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="bulk-delete-cancel" disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="bulk-delete-confirm"
            disabled={!isMatch || loading}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
