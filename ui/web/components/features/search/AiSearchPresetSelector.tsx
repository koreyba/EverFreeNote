import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SearchPreset } from '@core/constants/aiSearch'

interface AiSearchPresetSelectorProps {
  value: SearchPreset
  onChange: (preset: SearchPreset) => void
}

const PRESETS: { value: SearchPreset; label: string }[] = [
  { value: 'strict',  label: 'Strict'   },
  { value: 'neutral', label: 'Neutral'  },
  { value: 'broad',   label: 'Broad'    },
]

export function AiSearchPresetSelector({ value, onChange }: AiSearchPresetSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as SearchPreset) }}
      className="justify-start gap-1"
      aria-label="Search precision"
    >
      {PRESETS.map((p) => (
        <ToggleGroupItem
          key={p.value}
          value={p.value}
          className="text-xs h-6 px-2"
          aria-label={p.label}
        >
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
