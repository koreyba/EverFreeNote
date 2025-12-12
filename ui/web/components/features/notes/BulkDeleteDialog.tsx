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
import { Input } from "@/components/ui/input"

type BulkDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  loading?: boolean
  onConfirm: () => void
}

export function BulkDeleteDialog({ open, onOpenChange, count, loading = false, onConfirm }: BulkDeleteDialogProps) {
  const [value, setValue] = useState("")
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setValue("")
    }
    onOpenChange(next)
  }

  const isMatch = Number(value) === count && value.trim() !== ""

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete selected notes</AlertDialogTitle>
          <AlertDialogDescription>
            This action will delete {count} notes. Type the number above into the input to confirm you really want to delete them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Enter {count} to confirm</label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${count}`}
            type="number"
            min={0}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!isMatch || loading}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
