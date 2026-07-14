import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"

interface SelectionModeActionsProps {
  selectedCount: number
  onSelectAll: () => void
  onDelete: () => void
  onCancel: () => void
  selectingAllDisabled?: boolean
  deletingDisabled?: boolean
  deleting?: boolean
  className?: string
}

export function SelectionModeActions({
  selectedCount,
  onSelectAll,
  onDelete,
  onCancel,
  selectingAllDisabled = false,
  deletingDisabled = false,
  deleting = false,
  className,
}: SelectionModeActionsProps) {
  return (
    <div
      data-testid="selection-mode-actions"
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 text-xs border border-border/40 bg-card/65 dark:bg-card/45 backdrop-blur-md rounded-2xl shadow-sm",
        className
      )}
    >
      <div
        data-testid="selection-mode-count"
        className="flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums shrink-0"
        aria-label={`${selectedCount} selected`}
      >
        {selectedCount}
      </div>
      <div data-testid="selection-mode-buttons" className="flex items-center gap-1 min-w-0">
        <Button
          data-testid="selection-mode-select-all"
          variant="ghost"
          size="sm"
          className="rounded-full h-7 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all"
          onClick={onSelectAll}
          disabled={selectingAllDisabled}
        >
          Select all
        </Button>
        <Button
          data-testid="selection-mode-delete"
          variant="outline"
          size="sm"
          className="rounded-full h-7 px-3 text-[11px] font-bold text-destructive dark:text-red-400 hover:text-destructive dark:hover:text-red-300 hover:bg-destructive/10 dark:hover:bg-red-950/30 border-destructive/25 dark:border-red-900/50 hover:border-destructive/30 shadow-sm transition-all"
          onClick={onDelete}
          disabled={deleting || deletingDisabled}
        >
          {deleting ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Deleting</span>
            </span>
          ) : (
            `Delete (${selectedCount})`
          )}
        </Button>
        <Button
          data-testid="selection-mode-cancel"
          variant="ghost"
          size="sm"
          className="rounded-full h-7 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all"
          onClick={onCancel}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
