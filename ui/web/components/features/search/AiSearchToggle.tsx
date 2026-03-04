import { Sparkles } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AiSearchToggleProps {
  enabled: boolean
  hasApiKey: boolean
  onChange: (enabled: boolean) => void
}

export function AiSearchToggle({ enabled, hasApiKey, onChange }: AiSearchToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Switch
              id="ai-search-toggle"
              checked={enabled}
              onCheckedChange={onChange}
              disabled={!hasApiKey}
              aria-label="Toggle AI Search"
            />
            <Label
              htmlFor="ai-search-toggle"
              className="flex items-center gap-1 text-xs cursor-pointer select-none"
            >
              <Sparkles className="w-3 h-3" />
              AI Search
            </Label>
          </div>
        </TooltipTrigger>
        {!hasApiKey && (
          <TooltipContent side="right" className="text-xs">
            Configure Gemini API key in Settings → API Keys
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
