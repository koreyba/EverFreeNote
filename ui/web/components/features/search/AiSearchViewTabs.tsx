import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  const showDisabledHint = Boolean(disabled && disabledTitle)
  const [supportsHover, setSupportsHover] = React.useState(true)
  const [disabledHintOpen, setDisabledHintOpen] = React.useState(false)
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
    if (!showDisabledHint && disabledHintOpen) {
      setDisabledHintOpen(false)
    }
  }, [showDisabledHint, disabledHintOpen])

  React.useEffect(() => {
    if (supportsHover || !disabledHintOpen) return

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setDisabledHintOpen(false)
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [supportsHover, disabledHintOpen])

  const handleDisabledHintPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!showDisabledHint || supportsHover) return
    event.preventDefault()
    event.stopPropagation()
    setDisabledHintOpen((prev) => !prev)
  }

  const handleDisabledItemPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!disabled) return
    event.preventDefault()
  }

  const handleDisabledItemClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) return
    event.preventDefault()
  }

  const tabsControl = (
    <div data-testid="ai-search-view-tabs-trigger" onPointerDown={handleDisabledHintPointerDown}>
      <ToggleGroup
        data-testid="ai-search-view-tabs-group"
        type="single"
        value={value}
        onValueChange={(v) => {
          if (disabled) return
          if (v === 'note' || v === 'chunk') onChange(v)
        }}
        className="justify-start gap-1"
        aria-label="Result view mode"
      >
        <ToggleGroupItem
          data-testid="ai-search-view-tab-note"
          value="note"
          className="text-xs h-6 px-2 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
          aria-label="Note view"
          aria-disabled={disabled}
          data-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : undefined}
          onPointerDown={handleDisabledItemPointerDown}
          onClick={handleDisabledItemClick}
        >
          Notes
        </ToggleGroupItem>
        <ToggleGroupItem
          data-testid="ai-search-view-tab-chunk"
          value="chunk"
          className="text-xs h-6 px-2 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
          aria-label="Chunk view"
          aria-disabled={disabled}
          data-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : undefined}
          onPointerDown={handleDisabledItemPointerDown}
          onClick={handleDisabledItemClick}
        >
          Chunks
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )

  if (!showDisabledHint) {
    return tabsControl
  }

  return (
    <TooltipProvider>
      <Tooltip
        open={supportsHover ? undefined : disabledHintOpen}
        onOpenChange={supportsHover ? setDisabledHintOpen : undefined}
      >
        <TooltipTrigger asChild>
          <div ref={rootRef} data-testid="ai-search-view-tabs-root">{tabsControl}</div>
        </TooltipTrigger>
        <TooltipContent data-testid="ai-search-view-tabs-disabled-hint" side="bottom" align="end" sideOffset={6} className="text-xs">
          {disabledTitle}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
