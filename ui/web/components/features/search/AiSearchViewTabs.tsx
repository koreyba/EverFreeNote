import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ViewMode } from '@ui/web/hooks/useSearchMode'

interface AiSearchViewTabsProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  disabled?: boolean
  disabledTitle?: string
}

export function AiSearchViewTabs({
  value,
  onChange,
  disabled = false,
  disabledTitle,
}: AiSearchViewTabsProps) {
  return (
    <div title={disabled ? disabledTitle : undefined}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => { if (v === 'note' || v === 'chunk') onChange(v) }}
        className="justify-start gap-1"
        aria-label="Result view mode"
      >
        <ToggleGroupItem
          value="note"
          className="text-xs h-6 px-2"
          aria-label="Note view"
          disabled={disabled}
        >
          Notes
        </ToggleGroupItem>
        <ToggleGroupItem
          value="chunk"
          className="text-xs h-6 px-2"
          aria-label="Chunk view"
          disabled={disabled}
        >
          Chunks
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
