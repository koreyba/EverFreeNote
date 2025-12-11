"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { ExportSelectionDialog } from "@/components/ExportSelectionDialog"
import { ExportProgressDialog } from "@/components/ExportProgressDialog"
import { Button } from "@/components/ui/button"
import { ExportService } from "@/lib/enex/export-service"
import { ImageDownloader } from "@/lib/enex/image-downloader"
import { EnexBuilder } from "@/lib/enex/enex-builder"
import { useSupabase } from "@/lib/providers/SupabaseProvider"
import { NoteService } from "@core/services/notes"
import type { ExportProgress } from "@/lib/enex/export-types"

type ExportButtonProps = {
  onExportComplete?: (success: boolean, exportedCount: number) => void
}

export function ExportButton({ onExportComplete }: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = React.useState(false)
  const [progress, setProgress] = React.useState<ExportProgress>({
    currentNote: 0,
    totalNotes: 0,
    currentStep: "fetching",
    message: "Preparing",
  })

  const { supabase } = useSupabase()

  const noteService = React.useMemo(() => new NoteService(supabase), [supabase])
  const imageDownloader = React.useMemo(() => new ImageDownloader(), [])
  const enexBuilder = React.useMemo(() => new EnexBuilder(), [])
  const exportService = React.useMemo(
    () => new ExportService(noteService, enexBuilder, imageDownloader),
    [noteService, enexBuilder, imageDownloader],
  )

  const fetchAllNoteIds = React.useCallback(
    async (userId: string) => {
      const ids: string[] = []
      let page = 0
      const pageSize = 200
      while (true) {
        const { notes, hasMore, nextCursor } = await noteService.getNotes(userId, {
          page,
          pageSize,
        })
        ids.push(...notes.map((n) => n.id))
        if (!hasMore) break
        page = typeof nextCursor === "number" ? nextCursor : page + 1
      }
      return ids
    },
    [noteService],
  )

  const handleOpen = async () => {
    setDialogOpen(true)
  }

  const handleExport = async (selection: {
    selectAll: boolean
    selectedIds: string[]
    deselectedIds: string[]
    totalCount: number
  }) => {
    const { selectAll, selectedIds, deselectedIds } = selection
    const initialIds = selectAll ? [] : selectedIds
    if (!selectAll && initialIds.length === 0) return
    setExporting(true)
    setProgressDialogOpen(true)
    setProgress({
      currentNote: 0,
      totalNotes: selectAll ? selection.totalCount : initialIds.length,
      currentStep: "fetching",
      message: "Preparing notes",
    })
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You need to sign in to export notes")
        return
      }

      let noteIds = initialIds

      if (selectAll) {
        noteIds = await fetchAllNoteIds(user.id)
        if (deselectedIds.length) {
          const deselectedSet = new Set(deselectedIds)
          noteIds = noteIds.filter((id) => !deselectedSet.has(id))
        }
        setProgress((prev) => ({ ...prev, totalNotes: noteIds.length }))
      }

      const { blob, fileName } = await exportService.exportNotes(noteIds, user.id, (p) => setProgress(p))

      // Запускаем скачивание и закрытие диалога асинхронно, чтобы не блокировать UI
      // ExportSelectionDialog содержит много элементов, его закрытие занимает время
      setTimeout(() => {
        downloadBlob(blob, fileName)
        setDialogOpen(false)
      }, 0)

      toast.success(`Exported ${noteIds.length} notes`)
      onExportComplete?.(true, noteIds.length)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Failed to export notes")
      onExportComplete?.(false, 0)
      setProgress((prev) => ({
        ...prev,
        currentStep: "complete",
        message: "Export completed with errors",
      }))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button onClick={handleOpen} disabled={exporting} variant="outline" className="w-full">
        <Download className="w-4 h-4 mr-2" />
        {exporting ? "Exporting..." : "Export .enex file"}
      </Button>

      <ExportSelectionDialog open={dialogOpen} onOpenChange={setDialogOpen} onExport={handleExport} />

      <ExportProgressDialog open={progressDialogOpen} progress={progress} onClose={() => setProgressDialogOpen(false)} />
    </>
  )
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Откладываем освобождение URL, чтобы дать браузеру время на скачивание
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
