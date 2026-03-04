import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ViewMode } from '@ui/web/hooks/useSearchMode'

interface AiSearchViewTabsProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function AiSearchViewTabs({ value, onChange }: AiSearchViewTabsProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as ViewMode) }}
      className="justify-start gap-1"
      aria-label="Result view mode"
    >
      <ToggleGroupItem value="note" className="text-xs h-6 px-2" aria-label="Note view">
        Notes
      </ToggleGroupItem>
      <ToggleGroupItem value="chunk" className="text-xs h-6 px-2" aria-label="Chunk view">
        Chunks
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
