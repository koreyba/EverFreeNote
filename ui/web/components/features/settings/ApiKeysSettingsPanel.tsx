"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RagIndexingSettingsPanel } from "@/components/features/settings/RagIndexingSettingsPanel"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { ApiKeysSettingsService } from "@core/services/apiKeysSettings"

type ApiKeysSettingsPanelProps = {
  onClose?: () => void
  showCloseButton?: boolean
}

export function ApiKeysSettingsPanel({
  onClose,
  showCloseButton = false,
}: ApiKeysSettingsPanelProps) {
  const { supabase } = useSupabase()
  const service = React.useMemo(() => new ApiKeysSettingsService(supabase), [supabase])

  const [geminiApiKey, setGeminiApiKey] = React.useState("")
  const [configured, setConfigured] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const loadStatus = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setGeminiApiKey("")
    try {
      const status = await service.getStatus()
      setConfigured(status.gemini.configured)
    } catch (error) {
      setConfigured(false)
      setErrorMessage(error instanceof Error ? error.message : "Failed to load API key settings")
    } finally {
      setLoading(false)
    }
  }, [service])

  React.useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    const trimmedGeminiApiKey = geminiApiKey.trim()

    if (!trimmedGeminiApiKey && !configured) {
      setErrorMessage("Gemini API key is required for initial setup.")
      return
    }
    if (!trimmedGeminiApiKey && configured) {
      setSuccessMessage("No changes to save.")
      return
    }

    setSaving(true)
    try {
      await service.upsert(trimmedGeminiApiKey)
      setConfigured(true)
      setGeminiApiKey("")
      setSuccessMessage("API key saved.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save API key")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gemini API key</CardTitle>
          <CardDescription>
            Store the Gemini API key used for note indexing and AI search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">Gemini API Key</Label>
            <Input
              id="gemini-api-key"
              type="password"
              value={geminiApiKey}
              onChange={(event) => setGeminiApiKey(event.target.value)}
              placeholder={configured ? "Leave empty to keep current key" : "AIzaSy..."}
              disabled={loading || saving}
              autoComplete="off"
            />
            {configured ? (
              <p className="text-xs text-muted-foreground">
                A key is stored. Enter a new one only to replace it.
              </p>
            ) : null}
          </div>

          {configured ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-600/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              Gemini API key is configured.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-600/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            {showCloseButton ? (
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Close
              </Button>
            ) : null}
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? "Saving..." : "Save API key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RagIndexingSettingsPanel />
    </div>
  )
}
