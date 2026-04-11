"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/web/components/ui/select"
import { RagIndexSettingsService } from "@core/services/ragIndexSettings"
import type { RagIndexingEditableSettings, RagIndexingSettings } from "@core/rag/indexingSettings"
import {
  RAG_EMBEDDING_MODEL_PRESETS,
  getRagEmbeddingModelLabel,
  resolveRagEmbeddingModel,
} from "@core/rag/embeddingModels"
import {
  RAG_INDEX_EDITABLE_DEFAULTS,
  resolveRagIndexingSettings,
  validateRagIndexingEditableSettings,
} from "@core/rag/indexingSettings"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { Info } from "lucide-react"
import {
  settingsActionButtonClassName,
  settingsActionRowClassName,
  settingsSectionCardClassName,
} from "@/components/features/settings/settingsLayout"

const RAG_DEBUG_CHUNKS_KEY = "rag-debug-chunks"

export function isRagDebugChunksEnabled(): boolean {
  try {
    return localStorage.getItem(RAG_DEBUG_CHUNKS_KEY) === "true"
  } catch {
    return false
  }
}

type EditableNumericKey = keyof Pick<
  RagIndexingEditableSettings,
  "target_chunk_size" | "min_chunk_size" | "max_chunk_size" | "overlap"
>

type EditableBooleanKey = keyof Pick<RagIndexingEditableSettings, "use_title" | "use_section_headings" | "use_tags">

type RagIndexingFormState = ReturnType<typeof buildEditableState>

function buildEditableState(settings: RagIndexingSettings): {
  target_chunk_size: string
  min_chunk_size: string
  max_chunk_size: string
  overlap: string
  use_title: boolean
  use_section_headings: boolean
  use_tags: boolean
  embedding_model: RagIndexingEditableSettings["embedding_model"]
} {
  return {
    target_chunk_size: String(settings.target_chunk_size),
    min_chunk_size: String(settings.min_chunk_size),
    max_chunk_size: String(settings.max_chunk_size),
    overlap: String(settings.overlap),
    use_title: settings.use_title,
    use_section_headings: settings.use_section_headings,
    use_tags: settings.use_tags,
    embedding_model: settings.embedding_model,
  }
}

function buildDefaultEditableState(): RagIndexingFormState {
  return {
    target_chunk_size: String(RAG_INDEX_EDITABLE_DEFAULTS.target_chunk_size),
    min_chunk_size: String(RAG_INDEX_EDITABLE_DEFAULTS.min_chunk_size),
    max_chunk_size: String(RAG_INDEX_EDITABLE_DEFAULTS.max_chunk_size),
    overlap: String(RAG_INDEX_EDITABLE_DEFAULTS.overlap),
    use_title: RAG_INDEX_EDITABLE_DEFAULTS.use_title,
    use_section_headings: RAG_INDEX_EDITABLE_DEFAULTS.use_section_headings,
    use_tags: RAG_INDEX_EDITABLE_DEFAULTS.use_tags,
    embedding_model: RAG_INDEX_EDITABLE_DEFAULTS.embedding_model,
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
  const [formState, setFormState] = React.useState(buildDefaultEditableState)
  const [debugChunks, setDebugChunks] = React.useState(() => isRagDebugChunksEnabled())
  const displaySettings = resolvedSettings ?? resolveRagIndexingSettings(null)

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

  const validationErrors = React.useMemo(() => {
    return validateRagIndexingEditableSettings({
      target_chunk_size: Number(formState.target_chunk_size),
      min_chunk_size: Number(formState.min_chunk_size),
      max_chunk_size: Number(formState.max_chunk_size),
      overlap: Number(formState.overlap),
      use_title: formState.use_title,
      use_section_headings: formState.use_section_headings,
      use_tags: formState.use_tags,
      embedding_model: formState.embedding_model,
    })
  }, [formState])

  const handleSave = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const payload: RagIndexingEditableSettings = {
      target_chunk_size: Number(formState.target_chunk_size),
      min_chunk_size: Number(formState.min_chunk_size),
      max_chunk_size: Number(formState.max_chunk_size),
      overlap: Number(formState.overlap),
      use_title: formState.use_title,
      use_section_headings: formState.use_section_headings,
      use_tags: formState.use_tags,
      embedding_model: formState.embedding_model,
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
    <Card className={settingsSectionCardClassName}>
      <CardHeader>
        <CardTitle>RAG indexing</CardTitle>
        <CardDescription>
          When a note is indexed for AI search, its text is split into chunks — smaller pieces that are embedded and stored as vectors.
          The parameters below control how that splitting works. All size values are measured in characters.
          Changes apply only to future indexing — already indexed notes stay as-is until you reindex them manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumericField
            id="rag-min-chunk-size"
            label="Minimum chunk size (characters)"
            value={formState.min_chunk_size}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("min_chunk_size", value)}
            tooltip={
              "Paragraphs are merged together until the chunk reaches this size.\n" +
              "Also the minimum note size — shorter notes are skipped and not indexed at all.\n\n" +
              "Increase: fewer but larger chunks, short notes ignored.\n" +
              "Decrease: more granular chunks, even short notes get indexed."
            }
          />
          <NumericField
            id="rag-target-chunk-size"
            label="Target chunk size (characters)"
            value={formState.target_chunk_size}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("target_chunk_size", value)}
            tooltip={
              "Preferred chunk size. Once min is reached, one more whole paragraph " +
              "can be added — but only if the chunk stays within this limit.\n\n" +
              "Increase: chunks may include more paragraphs, broader context per chunk.\n" +
              "Decrease: chunks close earlier, more focused but potentially fragmented."
            }
          />
          <NumericField
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
                `Hard limit. Paragraphs longer than this are split — first by sentences, then by characters.\n` +
                `A small leftover (< min) is merged back into the previous piece.\n` +
                `Effective max in that case: ${max} + ${min} - 1 = ${effectiveMax} chars.\n\n` +
                `Increase: long paragraphs stay whole, fewer splits.\n` +
                `Decrease: more aggressive splitting of large paragraphs.`
              )
            })()}
          />
          <NumericField
            id="rag-overlap"
            label="Overlap (characters)"
            value={formState.overlap}
            disabled={loading || saving}
            onChange={(value) => updateNumericField("overlap", value)}
            inputMin={0}
            tooltip={
              "How many characters from the end of one chunk are repeated at the start of the next.\n" +
              "Must be less than min chunk size. Snaps to the nearest sentence end.\n" +
              "Never crosses section (heading) boundaries.\n\n" +
              "Increase: more shared context between chunks, better continuity.\n" +
              "Set to 0: no repetition, smaller chunks, less redundancy."
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rag-index-embedding-model">Embedding model</Label>
          <Select
            value={formState.embedding_model}
            onValueChange={(value) =>
              setFormState((current) => ({
                ...current,
                embedding_model: resolveRagEmbeddingModel(value),
              }))}
            disabled={loading || saving}
          >
            <SelectTrigger id="rag-index-embedding-model">
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
            Controls which Gemini embedding preset is used when you index note chunks.
          </p>
        </div>

        <div className="flex items-center justify-between -mt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rag-debug-chunks"
              checked={debugChunks}
              disabled={loading || saving}
              onCheckedChange={(checked) => {
                const value = checked === true
                setDebugChunks(value)
                try { localStorage.setItem(RAG_DEBUG_CHUNKS_KEY, String(value)) } catch { /* ignore */ }
              }}
            />
            <Label htmlFor="rag-debug-chunks" className="text-xs text-muted-foreground cursor-pointer">
              Debug: show chunks in console on indexing
            </Label>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
            disabled={loading || saving}
            onClick={() => {
              setFormState(buildDefaultEditableState())
              setDebugChunks(false)
              try { localStorage.removeItem(RAG_DEBUG_CHUNKS_KEY) } catch { /* ignore */ }
            }}
          >
            Reset to default values
          </button>
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

        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <ToggleRow
            id="rag-use-title"
            label="Use title for embeddings"
            description="Pass the note title to Gemini via the separate title field. The title is not duplicated inside chunk text."
            checked={formState.use_title}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_title", checked)}
          />
          <ToggleRow
            id="rag-use-sections"
            label="Use section headings"
            description='Append a "Section:" line after the chunk body when the note contains h1-h6 headings. Bold or styled text is not treated as a heading.'
            checked={formState.use_section_headings}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_section_headings", checked)}
          />
          <ToggleRow
            id="rag-use-tags"
            label="Use tags"
            description='Append a "Tags:" line after the chunk body when the note has tags assigned.'
            checked={formState.use_tags}
            disabled={loading || saving}
            onCheckedChange={(checked) => updateBooleanField("use_tags", checked)}
          />
        </div>

        <div className="space-y-5 rounded-xl border bg-muted/20 p-4">
          {!resolvedSettings && errorMessage ? (
            <p className="text-xs text-muted-foreground">
              Showing default system values until live indexing settings can be loaded from the server.
            </p>
          ) : null}
          <h4 className="text-sm font-semibold">How your notes are chunked</h4>

            <div className="space-y-3">
              <p className="text-xs text-foreground/80">
                Every note is split into paragraphs. Each paragraph becomes a building block for chunks.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-foreground/80">
                <li>
                  <strong>Headings as boundaries.</strong> If a note has{" "}
                  <code className="text-[11px] bg-muted px-1 rounded">h1</code>–<code className="text-[11px] bg-muted px-1 rounded">h6</code>{" "}
                  headings, they act as walls — paragraphs from different sections never end up in the same chunk,
                  and overlap never crosses a heading. Notes without headings are processed as one continuous section.
                  Bold or styled text does not count as a heading.
                </li>
                <li>
                  <strong>Merging small paragraphs.</strong> Neighboring paragraphs within the same section are merged
                  together until the chunk reaches <strong>min chunk size</strong>. If the next paragraph would push
                  the chunk past <strong>max chunk size</strong>, only a portion of it is taken.
                </li>
                <li>
                  <strong>Extending toward target.</strong> Once <strong>min chunk size</strong> is reached, the chunk
                  can accept one more whole paragraph — but only if the result stays within <strong>target chunk size</strong>.
                  Otherwise the chunk is closed and the paragraph starts a new one.
                </li>
                <li>
                  <strong>Splitting oversized paragraphs.</strong> A paragraph longer than <strong>max chunk size</strong>{" "}
                  is split first at sentence boundaries, then by characters. A tiny leftover is merged back so you
                  don{"'"}t get a useless 20-character chunk.
                </li>
                <li>
                  <strong>Trailing merge.</strong> If the very last chunk is smaller than <strong>min chunk size</strong>,
                  it is merged with the previous one (unless that would exceed <strong>max chunk size</strong>).
                </li>
                <li>
                  <strong>Overlap.</strong> The tail of each chunk is copied to the beginning of the next one.
                  This helps search find matches near chunk boundaries. Overlap prefers to start at a sentence end
                  and never crosses a section heading.
                </li>
              </ol>
              <p className="text-xs text-foreground/80">
                Notes shorter than <strong>min chunk size</strong> are not indexed — they are too short for meaningful semantic search.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-background p-3">
              <div className="text-xs font-medium text-muted-foreground">Tuning tips</div>
              <ul className="list-disc list-inside space-y-1 text-xs text-foreground/70">
                <li>
                  <strong>Short notes, lists, quick thoughts</strong> — lower <em>min chunk size</em> (e.g. 100) so they get indexed.
                </li>
                <li>
                  <strong>Long essays, articles</strong> — increase <em>target chunk size</em> (e.g. 800–1000) for more context per chunk.
                </li>
                <li>
                  <strong>Dense text without headings</strong> — increase <em>max chunk size</em> to avoid splitting long paragraphs.
                </li>
                <li>
                  <strong>Better search continuity</strong> — increase <em>overlap</em> (e.g. 150–200). Set to 0 if you want no repetition.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Embedding settings</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ReadOnlyRow
                  label="Embedding model"
                  value={getRagEmbeddingModelLabel(displaySettings.embedding_model)}
                  hint="Selected preset for future indexing."
                />
                <ReadOnlyRow label="Vector dimensions" value={String(displaySettings.output_dimensionality)} hint="Size of each embedding vector" />
                <ReadOnlyRow label="Indexing task type" value={displaySettings.task_type_document} hint="Used when embedding note chunks" />
                <ReadOnlyRow label="Search task type" value={displaySettings.task_type_query} hint="Used when embedding search queries" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Each chunk is formatted as</div>
              <pre className="overflow-x-auto rounded-lg border bg-background px-3 py-3 text-xs text-foreground">
                {displaySettings.chunk_template}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                The searchable body comes first. Section and Tags lines appear only when enabled above and when the note has the corresponding data.
                Overlap is added internally for retrieval continuity and is not shown here.
                Title is never in the chunk text — it is passed separately via the Gemini API title field.
              </p>
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
            disabled={loading || saving || validationErrors.length > 0}
            className={settingsActionButtonClassName}
          >
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
  tooltip,
  inputMin = 50,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  tooltip?: string
  inputMin?: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {tooltip ? (
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
        ) : null}
      </div>
      <Input
        id={id}
        type="number"
        min={inputMin}
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

function ReadOnlyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1 rounded-lg border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}
