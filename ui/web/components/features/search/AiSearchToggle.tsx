import * as React from 'react'
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
  const showSelectionBlockedHint = Boolean(disabled && disabledTitle)
  const [supportsHover, setSupportsHover] = React.useState(true)
  const [selectionHintOpen, setSelectionHintOpen] = React.useState(false)
  const [infoHintOpen, setInfoHintOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const apply = () => setSupportsHover(mediaQuery.matches)
    apply()
    mediaQuery.addEventListener('change', apply)
    return () => mediaQuery.removeEventListener('change', apply)
  }, [])

  React.useEffect(() => {
    if (!showSelectionBlockedHint && selectionHintOpen) {
      setSelectionHintOpen(false)
    }
  }, [showSelectionBlockedHint, selectionHintOpen])

  React.useEffect(() => {
    if (supportsHover) return
    if (!selectionHintOpen && !infoHintOpen) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setSelectionHintOpen(false)
      setInfoHintOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [supportsHover, selectionHintOpen, infoHintOpen])

  const handleSelectionHintPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!showSelectionBlockedHint || supportsHover) return
    event.preventDefault()
    event.stopPropagation()
    setSelectionHintOpen((prev) => !prev)
  }

  const toggleControl = (
    <div
      data-testid="ai-search-toggle-trigger"
      className="flex items-center gap-2"
      onPointerDown={handleSelectionHintPointerDown}
    >
      <Switch
        id="ai-search-toggle"
        data-testid="ai-search-toggle-switch"
        checked={enabled}
        onCheckedChange={onChange}
        disabled={isDisabled}
        aria-label="Toggle AI RAG Search"
      />
      <Label
        data-testid="ai-search-toggle-label"
        htmlFor="ai-search-toggle"
        className="flex items-center gap-1 text-xs cursor-pointer select-none"
      >
        <Sparkles className="w-3 h-3" />
        AI RAG Search
      </Label>
    </div>
  )

  return (
    <TooltipProvider>
      <div ref={rootRef} data-testid="ai-search-toggle-root" className="flex items-center gap-2">
        {showSelectionBlockedHint ? (
          <Tooltip
            open={supportsHover ? undefined : selectionHintOpen}
            onOpenChange={supportsHover ? setSelectionHintOpen : undefined}
          >
            <TooltipTrigger asChild>
              {toggleControl}
            </TooltipTrigger>
            <TooltipContent data-testid="ai-search-toggle-disabled-hint" side="bottom" align="start" sideOffset={6} className="text-xs">
              {disabledTitle}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              {toggleControl}
            </TooltipTrigger>
            {!hasApiKey && (
              <TooltipContent data-testid="ai-search-toggle-missing-key-hint" side="bottom" align="start" sideOffset={6} className="text-xs">
                Configure Gemini API key in Settings / API Keys
              </TooltipContent>
            )}
          </Tooltip>
        )}

        <Tooltip
          delayDuration={100}
          open={supportsHover ? undefined : infoHintOpen}
          onOpenChange={supportsHover ? setInfoHintOpen : undefined}
        >
          <TooltipTrigger asChild>
            <button
              data-testid="ai-search-toggle-info-trigger"
              type="button"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
              aria-label="About AI RAG Search"
              onPointerDown={(event) => {
                if (supportsHover) return
                event.preventDefault()
                event.stopPropagation()
                setInfoHintOpen((prev) => !prev)
              }}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent data-testid="ai-search-toggle-info-hint" side="bottom" align="end" sideOffset={6} className="max-w-52 text-xs">
            Searches your previously indexed notes using semantic (vector) similarity.
            Press <kbd className="font-mono">Enter</kbd> to run a query.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
