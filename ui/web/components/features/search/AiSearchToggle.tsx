import { Info, Sparkles } from 'lucide-react'
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
  disabled?: boolean
  disabledTitle?: string
}

export function AiSearchToggle({
  enabled,
  hasApiKey,
  onChange,
  disabled = false,
  disabledTitle,
}: AiSearchToggleProps) {
  const isDisabled = !hasApiKey || disabled

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center gap-2"
              title={disabled ? disabledTitle : undefined}
            >
              <Switch
                id="ai-search-toggle"
                checked={enabled}
                onCheckedChange={onChange}
                disabled={isDisabled}
                aria-label="Toggle AI RAG Search"
              />
              <Label
                htmlFor="ai-search-toggle"
                className="flex items-center gap-1 text-xs cursor-pointer select-none"
              >
                <Sparkles className="w-3 h-3" />
                AI RAG Search
              </Label>
            </div>
          </TooltipTrigger>
          {!hasApiKey && (
            <TooltipContent side="right" className="text-xs">
              Configure Gemini API key in Settings to API Keys
            </TooltipContent>
          )}
        </Tooltip>

        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
              aria-label="About AI RAG Search"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-52 text-xs">
            Searches your previously indexed notes using semantic (vector) similarity.
            Press <kbd className="font-mono">Enter</kbd> to run a query.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
