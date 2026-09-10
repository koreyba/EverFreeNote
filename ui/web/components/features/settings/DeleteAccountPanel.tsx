"use client"

import * as React from "react"
import { SignOut } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  settingsActionButtonClassName,
  settingsActionRowClassName,
} from "@/components/features/settings/settingsLayout"

type DeleteAccountPanelProps = {
  email?: string | null
  onConfirm: () => Promise<void> | void
  loading?: boolean
  /** Omitted where the panel is rendered without a session to end. */
  onSignOut?: () => Promise<void> | void
}

export function DeleteAccountPanel({
  email,
  onConfirm,
  loading = false,
  onSignOut,
}: DeleteAccountPanelProps) {
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [signingOut, setSigningOut] = React.useState(false)
  const isLoading = loading || submitting

  const handleSignOut = async () => {
    if (!onSignOut || signingOut) return
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  const handleConfirm = async () => {
    if (!acknowledged || isLoading) return

    setErrorMessage(null)
    setSubmitting(true)

    try {
      await onConfirm()
      setAcknowledged(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account. Please try again."
      setErrorMessage(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-muted/30 dark:bg-muted/10 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Email</p>
        <p className="mt-2 break-all text-sm sm:break-normal">{email ?? "No email available"}</p>
      </div>

      {onSignOut ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Signed in on this device</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Signing out leaves your account and notes untouched.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            data-cy="settings-sign-out-button"
            className="w-full shrink-0 rounded-full shadow-sm sm:w-auto"
          >
            <SignOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Permanent action</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will permanently delete your account and all notes. Export your notes before deleting the account if
          you need a copy.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background px-4 py-3">
        <Checkbox
          id="settings-delete-account-ack"
          checked={acknowledged}
          onCheckedChange={(value) => {
            setAcknowledged(Boolean(value))
            setErrorMessage(null)
          }}
        />
        <label htmlFor="settings-delete-account-ack" className="text-sm leading-snug text-muted-foreground">
          I understand that my account and all notes will be permanently deleted.
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className={settingsActionRowClassName}>
        <Button
          variant="destructive"
          disabled={!acknowledged || isLoading}
          onClick={() => void handleConfirm()}
          className={settingsActionButtonClassName}
        >
          {isLoading ? "Deleting..." : "Delete account"}
        </Button>
      </div>
    </div>
  )
}
