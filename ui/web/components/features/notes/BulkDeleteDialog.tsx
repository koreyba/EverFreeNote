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
  action?: 'trash' | 'purge'
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  loading?: boolean
  errorMessage?: string | null
  onClearError?: () => void
  onConfirm: () => void
}

type BulkDeleteDialogBodyProps = Omit<BulkDeleteDialogProps, "open" | "onOpenChange">

function BulkDeleteDialogBody({
  action = 'trash',
  count,
  loading = false,
  errorMessage = null,
  onClearError,
  onConfirm,
}: BulkDeleteDialogBodyProps) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!errorMessage) return
    const resetId = window.setTimeout(() => {
      setValue("")
    }, 0)
    return () => window.clearTimeout(resetId)
  }, [errorMessage])

  const isMatch = Number(value) === count && value.trim() !== ""

  return (
    <AlertDialogContent data-testid="bulk-delete-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>{action === 'purge' ? 'Permanently delete notes' : 'Move selected notes to Trash'}</AlertDialogTitle>
        <AlertDialogDescription>
          {action === 'purge'
            ? `This action will permanently delete ${count} notes. This cannot be undone.`
            : `This action will move ${count} notes to Trash. You can restore them for 30 days.`}
          {' '}Type the number above into the input to confirm.
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
          {loading ? "Deleting..." : action === 'purge' ? "Delete forever" : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

export function BulkDeleteDialog({
  action = 'trash',
  open,
  onOpenChange,
  count,
  loading = false,
  errorMessage = null,
  onClearError,
  onConfirm,
}: BulkDeleteDialogProps) {
  useEffect(() => {
    if (!open) {
      onClearError?.()
    }
  }, [open, onClearError])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <BulkDeleteDialogBody
          action={action}
          count={count}
          loading={loading}
          errorMessage={errorMessage}
          onClearError={onClearError}
          onConfirm={onConfirm}
        />
      ) : null}
    </AlertDialog>
  )
}
