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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"

import type { ExportProgress } from "@/lib/enex/export-types"

type ExportProgressDialogProps = {
  open: boolean
  progress: ExportProgress
  skippedImages?: number
  onClose: () => void
}

export function ExportProgressDialog({
  open,
  progress,
  skippedImages = 0,
  onClose,
}: ExportProgressDialogProps) {
  const { currentNote, totalNotes, currentStep, message } = progress
  const percent = totalNotes > 0 ? Math.round((currentNote / totalNotes) * 100) : 0
  const isComplete = currentStep === "complete"
  const isError = message.toLowerCase().includes("ошиб")

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
            {isComplete
              ? isError
                ? "Экспорт завершён с ошибкой"
                : "Экспорт завершён"
              : "Выполняется экспорт"}
          </DialogTitle>
          <DialogDescription>
            {isComplete ? "Файл готов к загрузке." : "Пожалуйста, не закрывайте окно до окончания экспорта."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Этап</span>
            <span className="font-medium">{message}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Заметки</span>
              <span className="font-medium">
                {currentNote} из {totalNotes || 0}
              </span>
            </div>
            <Progress value={percent} className="h-2" />
            <div className="text-center text-sm font-semibold text-primary">{percent}%</div>
          </div>

          {skippedImages > 0 && (
            <Alert variant="warning" className="border-amber-300 text-amber-900 dark:text-amber-200">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Изображения пропущены</AlertTitle>
              <AlertDescription>
                {skippedImages} изображений не удалось экспортировать. Файл создан без них.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {isComplete && (
          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              Закрыть
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
