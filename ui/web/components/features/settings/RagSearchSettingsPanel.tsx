"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/web/components/ui/select"
import {
  RAG_EMBEDDING_MODEL_PRESETS,
  getRagEmbeddingModelLabel,
  resolveRagEmbeddingModel,
} from "@core/rag/embeddingModels"
import {
  RAG_SEARCH_EDITABLE_DEFAULTS,
  resolveRagSearchSettings,
  validateRagSearchEditableSettings,
  type RagSearchSettings,
} from "@core/rag/searchSettings"
import { RagSearchSettingsService } from "@core/services/ragSearchSettings"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import {
  settingsActionButtonClassName,
  settingsActionRowClassName,
  settingsSectionCardClassName,
} from "@/components/features/settings/settingsLayout"

function buildEditableState(settings: RagSearchSettings) {
  return {
    top_k: String(settings.top_k),
    embedding_model: settings.embedding_model,
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
    embedding_model: RAG_SEARCH_EDITABLE_DEFAULTS.embedding_model,
  }))
  const displaySettings = resolvedSettings ?? resolveRagSearchSettings(null)
  const canEdit = !loading && resolvedSettings !== null

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
    loadSettings().catch(() => undefined)
  }, [loadSettings])

  const validationErrors = React.useMemo(() => {
    return validateRagSearchEditableSettings({
      top_k: Number(formState.top_k),
      embedding_model: formState.embedding_model,
    })
  }, [formState])

  const handleSave = async () => {
    if (!canEdit) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setSaving(true)

    try {
      const status = await service.upsert({
        top_k: Number(formState.top_k),
        embedding_model: formState.embedding_model,
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
    <Card className={settingsSectionCardClassName}>
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
            onChange={(event) => setFormState((current) => ({ ...current, top_k: event.target.value }))}
            disabled={!canEdit || saving}
          />
          <p className="text-xs text-muted-foreground">
            Controls how many chunk candidates are requested for each AI search page. Default: 15.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rag-search-embedding-model">Embedding model</Label>
          <Select
            value={formState.embedding_model}
            onValueChange={(value) =>
              setFormState((current) => ({
                ...current,
                embedding_model: resolveRagEmbeddingModel(value),
              }))}
            disabled={!canEdit || saving}
          >
            <SelectTrigger id="rag-search-embedding-model">
              <SelectValue placeholder="Choose embedding model" />
            </SelectTrigger>
            <SelectContent>
              {RAG_EMBEDDING_MODEL_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls which Gemini embedding preset is used when embedding search queries.
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

        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          {!resolvedSettings && errorMessage ? (
            <p className="text-xs text-muted-foreground">
              Showing default system values until live retrieval settings can be loaded from the server.
            </p>
          ) : null}
          <div className="text-xs font-medium text-muted-foreground">Search system settings</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyRow
              label="Embedding model"
              value={getRagEmbeddingModelLabel(displaySettings.embedding_model)}
              hint="Selected preset for future AI searches."
            />
            <ReadOnlyRow
              label="Current precision threshold"
              value={displaySettings.similarity_threshold.toFixed(2)}
              hint="Change this from the Precision slider in AI search."
            />
            <ReadOnlyRow
              label="Vector dimensions"
              value={String(displaySettings.output_dimensionality)}
              hint="Embedding vector size."
            />
            <ReadOnlyRow
              label="Document task type"
              value={displaySettings.task_type_document}
              hint="Used when embedding indexed note chunks."
            />
            <ReadOnlyRow
              label="Query task type"
              value={displaySettings.task_type_query}
              hint="Used when embedding search queries."
            />
            <ReadOnlyRow
              label="Load more overfetch"
              value={`+${displaySettings.load_more_overfetch}`}
              hint="Used to determine whether more backend results exist."
            />
            <ReadOnlyRow
              label="Retrieval max cap"
              value={String(displaySettings.max_top_k)}
              hint="Upper bound for the cumulative AI search result window."
            />
          </div>
        </div>

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

        <div className={settingsActionRowClassName}>
          <Button
            onClick={handleSave}
            disabled={!canEdit || saving || validationErrors.length > 0}
            className={settingsActionButtonClassName}
          >
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
