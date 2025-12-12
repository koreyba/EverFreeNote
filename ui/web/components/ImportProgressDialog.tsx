"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import type { ImportProgress, ImportResult } from "@core/enex/types"

type ImportProgressDialogProps = {
  open: boolean
  progress: ImportProgress
  result: ImportResult | null
  onClose: () => void
}

export function ImportProgressDialog({
  open,
  progress,
  result,
  onClose,
}: ImportProgressDialogProps) {
  const { currentFile, totalFiles, currentNote, totalNotes, fileName } = progress

  const fileProgress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0
  const noteProgress = totalNotes > 0 ? (currentNote / totalNotes) * 100 : 0

  const isComplete = result !== null
  const isInProgress = !isComplete && open

  return (
    <Dialog open={open} onOpenChange={isComplete ? onClose : () => {}}>
      <DialogContent
        className={`sm:max-w-[425px] ${isInProgress ? "[&>button]:hidden" : ""}`}
        onEscapeKeyDown={(event) => isInProgress && event.preventDefault()}
        onPointerDownOutside={(event) => isInProgress && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInProgress && <Loader2 className="w-5 h-5 animate-spin" />}
            {isComplete && result && result.success > 0 && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            {isComplete && result && result.success === 0 && result.errors > 0 && (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            {isComplete ? "Import Complete" : "Importing ENEX file"}
          </DialogTitle>
          <DialogDescription>
            {isInProgress && "Please wait while we import your notes..."}
            {isComplete && "Your import has finished."}
          </DialogDescription>
        </DialogHeader>

        {isInProgress && (
          <div className="space-y-4 py-4">
            {/* File Progress */}
            {totalFiles > 1 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Files</span>
                  <span className="font-medium">
                    {currentFile} of {totalFiles}
                  </span>
                </div>
                <Progress value={fileProgress} className="h-2" />
              </div>
            )}

            {/* Current File Name */}
            {fileName && (
              <div className="text-sm">
                <span className="text-muted-foreground">Current file: </span>
                <span className="font-medium truncate block">{fileName}</span>
              </div>
            )}

            {/* Note Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium">
                  {currentNote} of {totalNotes}
                </span>
              </div>
              <Progress value={noteProgress} className="h-2" />
            </div>

            {/* Progress Percentage */}
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">
                {Math.round(noteProgress)}%
              </span>
            </div>
          </div>
        )}

        {isComplete && result && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.success}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {result.errors}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {result.message && (
              <p className="text-sm text-muted-foreground text-center">
                {result.message}
              </p>
            )}

            {result.failedNotes && result.failedNotes.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View failed notes ({result.failedNotes.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {result.failedNotes.map((failed, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                      <div className="font-medium">{failed.title}</div>
                      <div className="text-muted-foreground">{failed.error}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

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
