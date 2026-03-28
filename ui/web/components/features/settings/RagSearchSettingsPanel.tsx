"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RAG_SEARCH_EDITABLE_DEFAULTS,
  validateRagSearchEditableSettings,
  type RagSearchSettings,
} from "@core/rag/searchSettings"
import { RagSearchSettingsService } from "@core/services/ragSearchSettings"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

function buildEditableState(settings: RagSearchSettings) {
  return {
    top_k: String(settings.top_k),
  }
}

export function RagSearchSettingsPanel() {
  const { supabase } = useSupabase()
  const service = React.useMemo(() => new RagSearchSettingsService(supabase), [supabase])

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [resolvedSettings, setResolvedSettings] = React.useState<RagSearchSettings | null>(null)
  const [formState, setFormState] = React.useState(() => ({
    top_k: String(RAG_SEARCH_EDITABLE_DEFAULTS.top_k),
  }))

  const loadSettings = React.useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const status = await service.getStatus()
      setResolvedSettings(status)
      setFormState(buildEditableState(status))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load RAG retrieval settings")
    } finally {
      setLoading(false)
    }
  }, [service])

  React.useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const validationErrors = React.useMemo(() => {
    return validateRagSearchEditableSettings({
      top_k: Number(formState.top_k),
    })
  }, [formState])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setSaving(true)

    try {
      const status = await service.upsert({
        top_k: Number(formState.top_k),
      })
      setResolvedSettings(status)
      setFormState(buildEditableState(status))
      setSuccessMessage("RAG retrieval settings saved.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save RAG retrieval settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RAG retrieval</CardTitle>
        <CardDescription>
          Configure how many semantic search candidates are requested per page. Precision is adjusted directly from the search UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="rag-search-top-k">Top K per page</Label>
          <Input
            id="rag-search-top-k"
            type="number"
            min={1}
            max={100}
            step={1}
            inputMode="numeric"
            value={formState.top_k}
            onChange={(event) => setFormState({ top_k: event.target.value })}
            disabled={loading || saving}
          />
          <p className="text-xs text-muted-foreground">
            Controls how many chunk candidates are requested for each AI search page. Default: 15.
          </p>
        </div>

        {validationErrors.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-600/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {resolvedSettings ? (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="text-xs font-medium text-muted-foreground">Search system settings</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ReadOnlyRow
                label="Current precision threshold"
                value={resolvedSettings.similarity_threshold.toFixed(2)}
                hint="Change this from the Precision slider in AI search."
              />
              <ReadOnlyRow
                label="Vector dimensions"
                value={String(resolvedSettings.output_dimensionality)}
                hint="Embedding vector size."
              />
              <ReadOnlyRow
                label="Document task type"
                value={resolvedSettings.task_type_document}
                hint="Used when embedding indexed note chunks."
              />
              <ReadOnlyRow
                label="Query task type"
                value={resolvedSettings.task_type_query}
                hint="Used when embedding search queries."
              />
              <ReadOnlyRow
                label="Load more overfetch"
                value={`+${resolvedSettings.load_more_overfetch}`}
                hint="Used to determine whether more backend results exist."
              />
              <ReadOnlyRow
                label="Retrieval max cap"
                value={String(resolvedSettings.max_top_k)}
                hint="Upper bound for the cumulative AI search result window."
              />
            </div>
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading || saving || validationErrors.length > 0}>
            {saving ? "Saving..." : "Save retrieval settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReadOnlyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}
