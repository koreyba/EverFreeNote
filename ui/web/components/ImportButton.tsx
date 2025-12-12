"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ImportDialog } from "@/components/ImportDialog"
import { ImportProgressDialog } from "@/components/ImportProgressDialog"
import { ContentConverter } from "@core/enex/converter"
import { EnexParser } from "@core/enex/parser"
import { ImageProcessor } from "@core/enex/image-processor"
import { NoteCreator } from "@core/enex/note-creator"
import {
  type DuplicateStrategy,
  type FailedImportNote,
  type ImportProgress,
  type ImportResult,
  type ImportStatus,
} from "@core/enex/types"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { browser } from "@ui/web/adapters/browser"

const IMPORT_STATE_KEY = "everfreenote-import-state"

type SupabaseClientType = ReturnType<typeof useSupabase>["supabase"]

async function fetchExistingTitles(client: SupabaseClientType, userId: string) {
  const { data, error } = await client
    .from("notes")
    .select("id, title")
    .eq("user_id", userId)

  if (error) {
    console.error("Failed to fetch existing titles:", error)
    return new Map<string, string>()
  }

  const map = new Map<string, string>()
  data?.forEach((row) => {
    if (!map.has(row.title)) {
      map.set(row.title, row.id)
    }
  })
  return map
}

const initialProgress: ImportProgress = {
  currentFile: 0,
  totalFiles: 0,
  currentNote: 0,
  totalNotes: 0,
  fileName: "",
}

type ImportButtonProps = {
  onImportComplete?: (
    status: ImportStatus,
    counts: { successCount: number; errorCount: number }
  ) => void
  maxFileSize?: number
}

export function ImportButton({ onImportComplete, maxFileSize = 100 * 1024 * 1024 }: ImportButtonProps) {
  const [importing, setImporting] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = React.useState(false)
  const [progress, setProgress] = React.useState<ImportProgress>(initialProgress)
  const [importResult, setImportResult] = React.useState<ImportResult | null>(
    null
  )
  const { supabase } = useSupabase()

  // Check for interrupted import on mount
  React.useEffect(() => {
    const savedState = browser.localStorage.getItem(IMPORT_STATE_KEY)
    if (savedState) {
      try {
        const state = JSON.parse(savedState) as Partial<ImportProgress> & {
          successCount?: number
          errorCount?: number
        }
        toast.warning(
          `Previous import was interrupted. ${state.successCount || 0} notes were imported before the interruption.`,
          { duration: 10000 }
        )
        browser.localStorage.removeItem(IMPORT_STATE_KEY)
      } catch (error) {
        console.error("Failed to parse saved import state:", error)
        browser.localStorage.removeItem(IMPORT_STATE_KEY)
      }
    }
  }, [])

  // Save import state to localStorage during import
  React.useEffect(() => {
    if (!importing) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = "Import is in progress. Are you sure you want to leave?"
    }
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }
    return undefined
  }, [importing])

  const handleImportClick = () => {
    setDialogOpen(true)
  }

  const handleImport = async (
    files: File[],
    settings: { duplicateStrategy: DuplicateStrategy; skipFileDuplicates: boolean }
  ) => {
    console.log("Starting import of", files.length, "files with settings:", settings)
    setImporting(true)
    setProgressDialogOpen(true)
    setImportResult(null)

    // Validate file sizes
    const oversizedFiles = files.filter((file) => file.size > maxFileSize)
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((file) => file.name).join(", ")
      toast.error(`Files too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB): ${fileNames}`)
      setImporting(false)
      setProgressDialogOpen(false)
      return
    }

    let successCount = 0
    let errorCount = 0
    let totalNotes = 0
    const failedNotes: FailedImportNote[] = []
    let lastSaveTime = 0
    const SAVE_INTERVAL = 2000 // Save to localStorage every 2 seconds

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("You must be logged in to import notes")
        setImporting(false)
        setProgressDialogOpen(false)
        return
      }

      const parser = new EnexParser()
      const imageProcessor = new ImageProcessor(supabase)
      const converter = new ContentConverter(imageProcessor)
      const noteCreator = new NoteCreator(supabase)

      // Snapshot существующих заголовков в базе до импорта
      const existingByTitle = await fetchExistingTitles(supabase, user.id)
      // Отслеживаем титлы, уже встреченные в текущем сеансе импорта (внутри файла/файлов)
      const seenTitlesInImport = new Set<string>()

      // Initialize progress
      setProgress({
        currentFile: 0,
        totalFiles: files.length,
        currentNote: 0,
        totalNotes: 0,
        fileName: "",
      })

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex]

        try {
          // Update file progress
          setProgress((prev) => ({
            ...prev,
            currentFile: fileIndex + 1,
            fileName: file.name,
          }))

          const notes = await parser.parse(file)
          totalNotes += notes.length

          // Update total notes count
          setProgress((prev) => ({
            ...prev,
            totalNotes,
          }))

          for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
            const note = notes[noteIndex]

            // Throttle localStorage updates - save every 2 seconds or on last note
            const now = Date.now()
            const isLastNote = noteIndex === notes.length - 1
            if (now - lastSaveTime > SAVE_INTERVAL || isLastNote) {
              browser.localStorage.setItem(
                IMPORT_STATE_KEY,
                JSON.stringify({
                  currentFile: fileIndex + 1,
                  totalFiles: files.length,
                  currentNote: successCount + errorCount,
                  totalNotes,
                  successCount,
                  errorCount,
                  fileName: file.name,
                })
              )
              lastSaveTime = now
            }

            try {
              const noteId = crypto.randomUUID()

              const convertedContent = await converter.convert(
                note.content,
                note.resources,
                user.id,
                noteId,
                note.title || "Untitled"
              )

              await noteCreator.create(
                {
                  ...note,
                  content: convertedContent,
                },
                user.id,
                settings.duplicateStrategy,
                {
                  skipFileDuplicates: settings.skipFileDuplicates,
                  existingByTitle,
                  seenTitlesInImport,
                }
              )

              successCount++

              // Update note progress
              setProgress((prev) => ({
                ...prev,
                currentNote: successCount + errorCount,
              }))
            } catch (error) {
              const err = error as Error
              console.error("Failed to import note:", note.title, err)
              errorCount++

              // Collect failed note details
              failedNotes.push({
                title: note.title || "Untitled",
                error: err.message || "Unknown error",
              })

              // Update note progress even on error
              setProgress((prev) => ({
                ...prev,
                currentNote: successCount + errorCount,
              }))
            }
          }
        } catch (error) {
          const err = error as Error
          console.error("Failed to process file:", file.name, err)
          toast.error(`Failed to process ${file.name}: ${err.message}`)
          errorCount++
        }
      }

      // Clear saved state on successful completion
      browser.localStorage.removeItem(IMPORT_STATE_KEY)

      // Set result and keep dialog open
      const result: ImportResult = {
        success: successCount,
        errors: errorCount,
        failedNotes,
        message:
          successCount > 0
            ? `Successfully imported ${successCount} note${successCount > 1 ? "s" : ""}`
            : errorCount > 0
              ? "All imports failed"
              : "No notes were imported",
      }
      setImportResult(result)

      // Call onImportComplete with status
      if (successCount > 0) {
        const status: ImportStatus = errorCount > 0 ? "partial" : "success"
        onImportComplete?.(status, { successCount, errorCount })
      }
    } catch (error) {
      const err = error as Error
      console.error("Import failed:", err)
      browser.localStorage.removeItem(IMPORT_STATE_KEY)

      // Set error result
      setImportResult({
        success: successCount,
        errors: errorCount + 1,
        failedNotes,
        message: `Import failed: ${err.message}`,
      })
    } finally {
      setImporting(false)
    }
  }

  const handleCloseProgressDialog = () => {
    setProgressDialogOpen(false)
    setImportResult(null)
    setProgress(initialProgress)
  }

  return (
    <>
      <Button
        onClick={handleImportClick}
        disabled={importing}
        variant="outline"
        className="w-full"
      >
        <Upload className="w-4 h-4 mr-2" />
        {importing ? "Importing..." : "Import .enex file"}
      </Button>

      <ImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onImport={handleImport}
      />

      <ImportProgressDialog
        open={progressDialogOpen}
        progress={progress}
        result={importResult}
        onClose={handleCloseProgressDialog}
      />
    </>
  )
}
