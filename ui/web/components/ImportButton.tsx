"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ImportDialog } from "@/components/ImportDialog"
import { ImportProgressDialog } from "@/components/ImportProgressDialog"
import { ContentConverter } from "@core/enex/converter"
import { resolveExistingTitlesForImport } from "@core/enex/import-shared"
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

const validateFilesSize = (files: File[], maxFileSize: number): boolean => {
  const oversizedFiles = files.filter((file) => file.size > maxFileSize)
  if (oversizedFiles.length > 0) {
    const fileNames = oversizedFiles.map((file) => file.name).join(", ")
    toast.error(`Files too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB): ${fileNames}`)
    return false
  }
  return true
}

const buildImportResultMessage = (
  successCount: number,
  skippedCount: number,
  errorCount: number
): string => {
  const messageParts: string[] = []

  if (successCount > 0) {
    messageParts.push(`Successfully imported ${successCount} note${successCount > 1 ? "s" : ""}`)
  }
  if (skippedCount > 0) {
    messageParts.push(`skipped ${skippedCount} duplicate note${skippedCount > 1 ? "s" : ""}`)
  }
  if (errorCount > 0) {
    if (messageParts.length > 0) {
      messageParts.push(`with ${errorCount} error${errorCount > 1 ? "s" : ""}`)
    } else {
      messageParts.push("All imports failed")
    }
  }

  return messageParts.length > 0 ? messageParts.join(", ") : "No notes were imported"
}

type ProcessImportNoteParams = {
  note: import("@core/enex/types").ParsedNote
  userId: string
  converter: ContentConverter
  noteCreator: NoteCreator
  duplicateStrategy: DuplicateStrategy
  skipFileDuplicates: boolean
  existingByTitle: Map<string, string> | null
  fallbackExistingByTitle: Map<string, string | null>
  seenTitlesInImport: Set<string>
}

async function processImportNote({
  note,
  userId,
  converter,
  noteCreator,
  duplicateStrategy,
  skipFileDuplicates,
  existingByTitle,
  fallbackExistingByTitle,
  seenTitlesInImport,
}: ProcessImportNoteParams): Promise<'success' | 'skipped'> {
  const noteId = crypto.randomUUID()
  const convertedContent = await converter.convert(
    note.content,
    note.resources,
    userId,
    noteId,
    note.title || "Untitled"
  )

  const createdId = await noteCreator.create(
    { ...note, content: convertedContent },
    userId,
    duplicateStrategy,
    {
      skipFileDuplicates,
      existingByTitle,
      fallbackExistingByTitle,
      seenTitlesInImport,
    }
  )

  return createdId ? 'success' : 'skipped'
}

export function ImportButton(props: Readonly<ImportButtonProps>) {
  const { onImportComplete, maxFileSize = 100 * 1024 * 1024 } = props
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
    }
    if (typeof globalThis.window !== "undefined") {
      globalThis.window.addEventListener("beforeunload", handleBeforeUnload)
      return () => globalThis.window.removeEventListener("beforeunload", handleBeforeUnload)
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

    if (!validateFilesSize(files, maxFileSize)) {
      setImporting(false)
      setProgressDialogOpen(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

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

      const existingByTitle = await resolveExistingTitlesForImport(
        supabase,
        user.id,
        settings.duplicateStrategy
      )
      const fallbackExistingByTitle = new Map<string, string | null>()
      const seenTitlesInImport = new Set<string>()

      let successCount = 0
      let skippedCount = 0
      let errorCount = 0
      let totalNotes = 0
      const failedNotes: FailedImportNote[] = []
      let lastSaveTime = 0
      const SAVE_INTERVAL = 2000

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
          setProgress((prev) => ({
            ...prev,
            currentFile: fileIndex + 1,
            fileName: file.name,
          }))

          const notes = await parser.parse(file)
          totalNotes += notes.length

          setProgress((prev) => ({
            ...prev,
            totalNotes,
          }))

          for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
            const note = notes[noteIndex]
            const now = Date.now()
            const isLastNote = noteIndex === notes.length - 1
            if (now - lastSaveTime > SAVE_INTERVAL || isLastNote) {
              browser.localStorage.setItem(
                IMPORT_STATE_KEY,
                JSON.stringify({
                  currentFile: fileIndex + 1,
                  totalFiles: files.length,
                  currentNote: successCount + skippedCount + errorCount,
                  totalNotes,
                  successCount,
                  skippedCount,
                  errorCount,
                  fileName: file.name,
                })
              )
              lastSaveTime = now
            }

            try {
              const res = await processImportNote({
                note,
                userId: user.id,
                converter,
                noteCreator,
                duplicateStrategy: settings.duplicateStrategy,
                skipFileDuplicates: settings.skipFileDuplicates,
                existingByTitle,
                fallbackExistingByTitle,
                seenTitlesInImport,
              })

              if (res === 'success') {
                successCount++
              } else {
                skippedCount++
              }
            } catch (error) {
              const err = error as Error
              console.error("Failed to import note:", note.title, err)
              errorCount++

              failedNotes.push({
                title: note.title || "Untitled",
                error: err.message || "Unknown error",
              })
            }

            setProgress((prev) => ({
              ...prev,
              currentNote: successCount + skippedCount + errorCount,
            }))
          }
        } catch (error) {
          const err = error as Error
          console.error("Failed to process file:", file.name, err)
          toast.error(`Failed to process ${file.name}: ${err.message}`)
          errorCount++
        }
      }

      browser.localStorage.removeItem(IMPORT_STATE_KEY)

      const result: ImportResult = {
        success: successCount,
        errors: errorCount,
        failedNotes,
        message: buildImportResultMessage(successCount, skippedCount, errorCount),
      }
      setImportResult(result)

      if (successCount > 0) {
        const status: ImportStatus = errorCount > 0 ? "partial" : "success"
        onImportComplete?.(status, { successCount, errorCount })
      }
    } catch (error) {
      const err = error as Error
      console.error("Import failed:", err)
      browser.localStorage.removeItem(IMPORT_STATE_KEY)

      setImportResult({
        success: 0,
        errors: 1,
        failedNotes: [],
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
