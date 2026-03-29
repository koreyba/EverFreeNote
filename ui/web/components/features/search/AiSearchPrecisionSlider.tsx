import { Slider } from "@/components/ui/slider"
import {
  RAG_SEARCH_THRESHOLD_MAX,
  RAG_SEARCH_THRESHOLD_MIN,
  RAG_SEARCH_THRESHOLD_STEP,
} from "@core/rag/searchSettings"
import { cn } from "@ui/web/lib/utils"

interface AiSearchPrecisionSliderProps {
  value: number
  disabled?: boolean
  topK: number
  onChange: (value: number) => void
  onCommit: (value: number) => void
}

export function AiSearchPrecisionSlider({
  value,
  disabled = false,
  topK,
  onChange,
  onCommit,
}: AiSearchPrecisionSliderProps) {
  return (
    <div className={cn("space-y-2 rounded-lg border bg-muted/20 px-3 py-3", disabled && "opacity-70")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-foreground">Precision</div>
          <div className="text-[11px] text-muted-foreground">
            Lower values return more results. Higher values keep results cleaner.
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium tabular-nums">{value.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground">Top K {topK}</div>
        </div>
      </div>

      <Slider
        min={RAG_SEARCH_THRESHOLD_MIN}
        max={RAG_SEARCH_THRESHOLD_MAX}
        step={RAG_SEARCH_THRESHOLD_STEP}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? value)}
        onValueCommit={(values) => onCommit(values[0] ?? value)}
        disabled={disabled}
        aria-label="Precision"
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>More results</span>
        <span>Cleaner results</span>
      </div>
    </div>
  )
}
