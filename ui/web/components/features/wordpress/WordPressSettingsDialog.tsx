"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { WordPressSettingsService } from "@core/services/wordpressSettings"

type WordPressSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfiguredChange?: (configured: boolean) => void
}

const normalizeSiteUrl = (value: string) => value.trim().replace(/\/+$/, "")

export function WordPressSettingsDialog({
  open,
  onOpenChange,
  onConfiguredChange,
}: WordPressSettingsDialogProps) {
  const { supabase } = useSupabase()
  const settingsService = React.useMemo(() => new WordPressSettingsService(supabase), [supabase])

  const [siteUrl, setSiteUrl] = React.useState("")
  const [wpUsername, setWpUsername] = React.useState("")
  const [applicationPassword, setApplicationPassword] = React.useState("")
  const [enabled, setEnabled] = React.useState(true)
  const [hasStoredPassword, setHasStoredPassword] = React.useState(false)
  const [configured, setConfigured] = React.useState(false)

  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const loadStatus = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const status = await settingsService.getStatus()
      setConfigured(status.configured)
      setSiteUrl(status.integration?.siteUrl ?? "")
      setWpUsername(status.integration?.wpUsername ?? "")
      setEnabled(status.integration?.enabled ?? true)
      setHasStoredPassword(Boolean(status.integration?.hasPassword))
      setApplicationPassword("")
      onConfiguredChange?.(status.configured)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load WordPress settings"
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }, [onConfiguredChange, settingsService])

  React.useEffect(() => {
    if (!open) return
    void loadStatus()
  }, [loadStatus, open])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
    const normalizedUsername = wpUsername.trim()

    if (!normalizedSiteUrl || !normalizedUsername) {
      setErrorMessage("Site URL and username are required.")
      return
    }

    if (!applicationPassword.trim() && !hasStoredPassword) {
      setErrorMessage("Application password is required for initial setup.")
      return
    }

    setSaving(true)

    try {
      const result = await settingsService.upsert({
        siteUrl: normalizedSiteUrl,
        wpUsername: normalizedUsername,
        applicationPassword: applicationPassword.trim() || undefined,
        enabled,
      })

      setConfigured(result.configured)
      setHasStoredPassword(true)
      setApplicationPassword("")
      setSuccessMessage("WordPress settings saved.")
      onConfiguredChange?.(result.configured)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save WordPress settings"
      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-[560px] sm:p-6">
        <DialogHeader>
          <DialogTitle>WordPress integration</DialogTitle>
          <DialogDescription>
            Configure site URL, username and application password. Export buttons are shown only when integration is
            configured and enabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wp-site-url">Site URL</Label>
            <Input
              id="wp-site-url"
              value={siteUrl}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder="https://example.com"
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-username">WordPress username</Label>
            <Input
              id="wp-username"
              value={wpUsername}
              onChange={(event) => setWpUsername(event.target.value)}
              placeholder="editor-user"
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wp-app-password">Application password</Label>
            <Input
              id="wp-app-password"
              type="password"
              value={applicationPassword}
              onChange={(event) => setApplicationPassword(event.target.value)}
              placeholder={hasStoredPassword ? "Leave empty to keep current password" : "xxxx xxxx xxxx xxxx"}
              disabled={loading || saving}
            />
            {hasStoredPassword ? (
              <p className="text-xs text-muted-foreground">Stored password exists. Enter a new one only to replace it.</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="wp-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(Boolean(checked))}
              disabled={loading || saving}
            />
            <Label htmlFor="wp-enabled" className="cursor-pointer">
              Enable WordPress export
            </Label>
          </div>

          {configured ? (
            <div className="rounded-md border border-emerald-600/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Integration is configured.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Close
            </Button>
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
