"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

type DeleteAccountPanelProps = {
  email?: string | null
  onConfirm: () => Promise<void> | void
  loading?: boolean
}

export function DeleteAccountPanel({
  email,
  onConfirm,
  loading = false,
}: DeleteAccountPanelProps) {
  const [acknowledged, setAcknowledged] = React.useState(false)

  const handleConfirm = async () => {
    if (!acknowledged || loading) return
    await onConfirm()
    setAcknowledged(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Email</p>
        <p className="mt-2 break-all text-sm sm:break-normal">{email ?? "No email available"}</p>
      </div>

      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <h3 className="text-base font-semibold text-destructive">Permanent action</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will permanently delete your account and all notes. Export your notes before deleting the account if
          you need a copy.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border bg-background px-4 py-3">
        <Checkbox
          id="settings-delete-account-ack"
          checked={acknowledged}
          onCheckedChange={(value) => setAcknowledged(Boolean(value))}
        />
        <label htmlFor="settings-delete-account-ack" className="text-sm leading-snug text-muted-foreground">
          I understand that my account and all notes will be permanently deleted.
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={!acknowledged || loading}
          onClick={() => void handleConfirm()}
        >
          {loading ? "Deleting..." : "Delete account"}
        </Button>
      </div>
    </div>
  )
}
