"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { WordPressSettingsService } from "@core/services/wordpressSettings"
import {
  settingsActionButtonClassName,
  settingsActionRowClassName,
  settingsInsetPanelClassName,
} from "@/components/features/settings/settingsLayout"

type WordPressSettingsPanelProps = {
  onConfiguredChange?: (configured: boolean) => void
  onClose?: () => void
  showCloseButton?: boolean
}

const normalizeValidSiteUrl = (value: string): string | null => {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const parsedUrl = new URL(trimmedValue)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      return null
    }

    const normalizedPathname = parsedUrl.pathname.replace(/\/+$/, '')
    const normalizedBase = `${parsedUrl.origin}${normalizedPathname === '/' ? '' : normalizedPathname}`
    return `${normalizedBase}${parsedUrl.search}`
  } catch {
    return null
  }
}

export function WordPressSettingsPanel({
  onConfiguredChange,
  onClose,
  showCloseButton = false,
}: WordPressSettingsPanelProps) {
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
    void loadStatus()
  }, [loadStatus])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedSiteUrl = normalizeValidSiteUrl(siteUrl)
    const normalizedUsername = wpUsername.trim()

    if (!siteUrl.trim() || !normalizedUsername) {
      setErrorMessage("Site URL and username are required.")
      return
    }

    if (!normalizedSiteUrl) {
      setErrorMessage("Enter a valid site URL including http:// or https://.")
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
    <div className="space-y-6">
      <div className={`${settingsInsetPanelClassName} space-y-5`}>
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

        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
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

      <div className={settingsActionRowClassName}>
        {showCloseButton ? (
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className={settingsActionButtonClassName}
          >
            Close
          </Button>
        ) : null}
        <Button
          onClick={handleSave}
          disabled={loading || saving}
          className={settingsActionButtonClassName}
        >
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  )
}
