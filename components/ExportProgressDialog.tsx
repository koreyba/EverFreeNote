"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"

import type { ExportProgress } from "@/lib/enex/export-types"

type ExportProgressDialogProps = {
  open: boolean
  progress: ExportProgress
  onClose: () => void
}

export function ExportProgressDialog({ open, progress, onClose }: ExportProgressDialogProps) {
  const { currentNote, totalNotes, currentStep, message } = progress
  const percent = totalNotes > 0 ? Math.round((currentNote / totalNotes) * 100) : 0
  const isComplete = currentStep === "complete"
  const isError = message.toLowerCase().includes("error")

  return (
    <Dialog open={open} onOpenChange={isComplete ? onClose : () => {}}>
      <DialogContent
        className={`sm:max-w-[420px] ${!isComplete ? "[&>button]:hidden" : ""}`}
        onEscapeKeyDown={(event) => !isComplete && event.preventDefault()}
        onPointerDownOutside={(event) => !isComplete && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete && <Loader2 className="w-5 h-5 animate-spin" />}
            {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {isComplete ? (isError ? "Export completed with errors" : "Export completed") : "Export in progress"}
          </DialogTitle>
          <DialogDescription>
            {isComplete ? "File is ready to download." : "Please keep this window open until export finishes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium">
                {currentNote} of {totalNotes || 0}
              </span>
            </div>
            <Progress value={percent} className="h-2" />
            <div className="text-center text-sm font-semibold text-primary">{percent}%</div>
          </div>
        </div>

        {isComplete && (
          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
