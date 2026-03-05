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
    <div className={cn("flex items-center justify-between gap-2 px-3 py-2 text-sm", className)}>
      <div className="font-medium tabular-nums whitespace-nowrap shrink-0" aria-label={`${selectedCount} selected`}>
        {selectedCount}
      </div>
      <div className="flex items-center gap-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs whitespace-nowrap"
          onClick={onSelectAll}
          disabled={selectingAllDisabled}
        >
          Select all
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 px-2 text-xs whitespace-nowrap"
          onClick={onDelete}
          disabled={deletingDisabled}
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : `Delete (${selectedCount})`}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs whitespace-nowrap"
          onClick={onCancel}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
