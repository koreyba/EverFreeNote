import { ArrowCounterClockwise, CircleNotch, Trash } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"

interface SelectionModeActionsProps {
  selectedCount: number
  onSelectAll: () => void
  onDelete: () => void
  onRestore?: () => void
  deleteLabel?: string
  onCancel?: () => void
  selectingAllDisabled?: boolean
  deletingDisabled?: boolean
  deleting?: boolean
  busy?: boolean
  className?: string
}

const actionButton = "h-11 min-w-11 shrink-0 rounded-lg px-0 @min-[350px]/selection:px-2.5"
const actionLabel = "hidden @min-[350px]/selection:inline"

export function SelectionModeActions({
  selectedCount,
  onSelectAll,
  onDelete,
  onRestore,
  deleteLabel = "Move to Trash",
  onCancel,
  selectingAllDisabled = false,
  deletingDisabled = false,
  deleting = false,
  busy = false,
  className,
}: SelectionModeActionsProps) {
  const working = busy || deleting
  return (
    <div
      data-testid="selection-mode-actions"
      role="group"
      aria-label="Selection actions"
      aria-busy={working || undefined}
      className={cn("@container/selection flex h-12 min-w-0 flex-1 items-center gap-0.5", className)}
    >
      <div
        data-testid="selection-mode-count"
        aria-live="polite"
        aria-atomic="true"
        className={cn("min-w-0 text-[11px] font-semibold leading-tight tabular-nums", selectedCount ? "text-primary" : "text-muted-foreground")}
      >
        {selectedCount} selected
      </div>
      <Button
        type="button"
        data-testid="selection-mode-select-all"
        variant="ghost"
        size="sm"
        title="Select all loaded notes"
        className="h-11 shrink-0 rounded-lg px-1"
        onClick={onSelectAll}
        disabled={selectingAllDisabled || working}
      >
        Select all
      </Button>
      <div data-testid="selection-mode-buttons" className="ml-auto flex shrink-0 items-center">
        {onRestore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Restore"
            title="Restore selected notes"
            className={cn(actionButton, "text-primary hover:bg-primary/10 hover:text-primary")}
            onClick={onRestore}
            disabled={working || deletingDisabled}
          >
            <ArrowCounterClockwise aria-hidden="true" />
            <span className={actionLabel}>Restore</span>
          </Button>
        )}
        <Button
          type="button"
          data-testid="selection-mode-delete"
          variant="ghost"
          size="sm"
          aria-label={deleting ? "Deleting" : deleteLabel}
          title={deleteLabel}
          className={cn(actionButton, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
          onClick={onDelete}
          disabled={working || deletingDisabled}
        >
          {deleting ? <CircleNotch className="animate-spin" aria-hidden="true" /> : <Trash aria-hidden="true" />}
          <span className={actionLabel}>{deleting ? "Deleting" : deleteLabel}</span>
        </Button>
        {onCancel && (
          <Button
            type="button"
            data-testid="selection-mode-cancel"
            variant="ghost"
            size="sm"
            className="h-11 min-w-11 rounded-lg px-2"
            onClick={onCancel}
            disabled={working}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
