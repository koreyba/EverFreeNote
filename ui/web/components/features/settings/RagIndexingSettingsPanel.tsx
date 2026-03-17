"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RagIndexSettingsService } from "@core/services/ragIndexSettings"
import type { RagIndexingEditableSettings, RagIndexingSettings } from "@core/rag/indexingSettings"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { Info } from "lucide-react"

type EditableNumericKey = keyof Pick<
  RagIndexingEditableSettings,
  "small_note_threshold" | "target_chunk_size" | "min_chunk_size" | "max_chunk_size" | "overlap"
>

type EditableBooleanKey = keyof Pick<RagIndexingEditableSettings, "use_title" | "use_section_headings" | "use_tags">

function buildEditableState(settings: RagIndexingSettings) {
  return {
    small_note_threshold: String(settings.small_note_threshold),
    target_chunk_size: String(settings.target_chunk_size),
    min_chunk_size: String(settings.min_chunk_size),
    max_chunk_size: String(settings.max_chunk_size),
    overlap: String(settings.overlap),
    use_title: settings.use_title,
    use_section_headings: settings.use_section_headings,
    use_tags: settings.use_tags,
  }
}

export function RagIndexingSettingsPanel() {
  const { supabase } = useSupabase()
  const service = React.useMemo(() => new RagIndexSettingsService(supabase), [supabase])

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [resolvedSettings, setResolvedSettings] = React.useState<RagIndexingSettings | null>(null)
  const [formState, setFormState] = React.useState(() => ({
    small_note_threshold: "400",
    target_chunk_size: "500",
    min_chunk_size: "200",
    max_chunk_size: "1500",
    overlap: "100",
    use_title: true,
    use_section_headings: true,
    use_tags: true,
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to load RAG indexing settings")
    } finally {
      setLoading(false)
    }
  }, [service])

  React.useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const updateNumericField = (key: EditableNumericKey, value: string) => {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  const updateBooleanField = (key: EditableBooleanKey, checked: boolean) => {
    setFormState((current) => ({ ...current, [key]: checked }))
  }

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: RagIndexingEditableSettings = {
      small_note_threshold: Number(formState.small_note_threshold),
      target_chunk_size: Number(formState.target_chunk_size),
      min_chunk_size: Number(formState.min_chunk_size),
      max_chunk_size: Number(formState.max_chunk_size),
      overlap: Number(formState.overlap),
      use_title: formState.use_title,
      use_section_headings: formState.use_section_headings,
      use_tags: formState.use_tags,
    }

    setSaving(true)
    try {
      const status = await service.upsert(payload)
      setResolvedSettings(status)
      setFormState(buildEditableState(status))
      setSuccessMessage("RAG indexing settings saved. Changes apply only to future indexing and future manual reindex.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save RAG indexing settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RAG indexing</CardTitle>
        <CardDescription>
          Configure web-visible indexing behavior. All size values are measured in characters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumericField
            id="rag-small-note-threshold"
            label="Small note threshold (characters)"
            value={formState.small_note_threshold}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("small_note_threshold", value)}
          />
          <NumericField
            id="rag-target-chunk-size"
            label="Target chunk size (characters)"
            value={formState.target_chunk_size}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("target_chunk_size", value)}
          />
          <NumericField
            id="rag-min-chunk-size"
            label="Minimum chunk size (characters)"
            value={formState.min_chunk_size}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("min_chunk_size", value)}
          />
          <NumericFieldWithTooltip
            id="rag-max-chunk-size"
            label="Maximum chunk size (characters)"
            value={formState.max_chunk_size}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("max_chunk_size", value)}
            tooltip={(() => {
              const max = Number(formState.max_chunk_size) || 0
              const min = Number(formState.min_chunk_size) || 0
              const effectiveMax = max + min - 1
              return (
                `When an oversized paragraph is split, a small remainder (< min_chunk_size) ` +
                `is merged back into the previous piece. The effective maximum in that case:\n` +
                `max_chunk_size + min_chunk_size - 1 = ${max} + ${min} - 1 = ${effectiveMax} characters.`
              )
            })()}
          />
          <NumericField
            id="rag-overlap"
            label="Overlap (characters)"
            value={formState.overlap}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("overlap", value)}
          />
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <ToggleRow
            id="rag-use-title"
            label="Use title for embeddings"
            description="Pass the note title separately via the Gemini title field."
            checked={formState.use_title}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_title", checked)}
          />
          <ToggleRow
            id="rag-use-sections"
            label="Use section headings"
            description="Show a Section line when the note contains real h1-h6 headings."
            checked={formState.use_section_headings}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_section_headings", checked)}
          />
          <ToggleRow
            id="rag-use-tags"
            label="Use tags"
            description="Show a Tags line when the note has tags."
            checked={formState.use_tags}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_tags", checked)}
          />
        </div>

        {resolvedSettings ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div>
              <h4 className="text-sm font-semibold">Read-only system settings</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                These values are system-defined and shown for transparency.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyRow label="Document taskType" value={resolvedSettings.task_type_document} />
              <ReadOnlyRow label="Query taskType" value={resolvedSettings.task_type_query} />
              <ReadOnlyRow label="Output dimensionality" value={String(resolvedSettings.output_dimensionality)} />
              <ReadOnlyRow label="Split strategy" value={resolvedSettings.split_strategy} />
              <ReadOnlyRow label="Fallback split order" value={resolvedSettings.fallback_split_order.join(" -> ")} />
              <ReadOnlyRow label="Chunk accumulation rule" value={resolvedSettings.chunk_accumulation_rule} />
              <ReadOnlyRow label="Small chunk merge rule" value={resolvedSettings.small_chunk_merge_rule} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rag-chunk-template">Chunk structure template</Label>
              <pre
                id="rag-chunk-template"
                className="overflow-x-auto rounded-lg border bg-background px-3 py-3 text-xs text-foreground"
              >
                {resolvedSettings.chunk_template}
              </pre>
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
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save indexing settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function NumericField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={50}
        max={5000}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function NumericFieldWithTooltip({
  id,
  label,
  value,
  disabled,
  onChange,
  tooltip,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  tooltip: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-line">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        id={id}
        type="number"
        min={50}
        max={5000}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
