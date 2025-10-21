'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ImportDialog } from '@/components/ImportDialog'
import { ImportProgressDialog } from '@/components/ImportProgressDialog'
import { EnexParser } from '@/lib/enex/parser'
import { ContentConverter } from '@/lib/enex/converter'
import { ImageProcessor } from '@/lib/enex/image-processor'
import { NoteCreator } from '@/lib/enex/note-creator'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const IMPORT_STATE_KEY = 'everfreenote-import-state'

export function ImportButton({ onImportComplete }) {
  const [importing, setImporting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [progress, setProgress] = useState({
    currentFile: 0,
    totalFiles: 0,
    currentNote: 0,
    totalNotes: 0,
    fileName: ''
  })
  const [importResult, setImportResult] = useState(null)

  // Check for interrupted import on mount
  useEffect(() => {
    const savedState = localStorage.getItem(IMPORT_STATE_KEY)
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        // Show warning about interrupted import
        toast.warning(
          `Previous import was interrupted. ${state.successCount || 0} notes were imported before the interruption.`,
          { duration: 10000 }
        )
        localStorage.removeItem(IMPORT_STATE_KEY)
      } catch (error) {
        console.error('Failed to parse saved import state:', error)
        localStorage.removeItem(IMPORT_STATE_KEY)
      }
    }
  }, [])

  // Save import state to localStorage during import
  useEffect(() => {
    if (importing) {
      const handleBeforeUnload = (e) => {
        e.preventDefault()
        e.returnValue = 'Import is in progress. Are you sure you want to leave?'
      }
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [importing])

  const handleImportClick = () => {
    setDialogOpen(true)
  }

  const handleImport = async (files, settings) => {
    console.log('Starting import of', files.length, 'files with settings:', settings)
    setImporting(true)
    setProgressDialogOpen(true)
    setImportResult(null)
    
    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ')
      toast.error(`Files too large (max 100MB): ${fileNames}`)
      setImporting(false)
      setProgressDialogOpen(false)
      return
    }

    let successCount = 0
    let errorCount = 0
    let totalNotes = 0
    let failedNotes = []
    let lastSaveTime = 0
    const SAVE_INTERVAL = 2000 // Save to localStorage every 2 seconds

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to import notes')
        setImporting(false)
        setProgressDialogOpen(false)
        return
      }

      const parser = new EnexParser()
      const imageProcessor = new ImageProcessor()
      const converter = new ContentConverter(imageProcessor)
      const noteCreator = new NoteCreator()

      // Initialize progress
      setProgress({
        currentFile: 0,
        totalFiles: files.length,
        currentNote: 0,
        totalNotes: 0,
        fileName: ''
      })

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex]
        
        try {
          // Update file progress
          setProgress(prev => ({
            ...prev,
            currentFile: fileIndex + 1,
            fileName: file.name
          }))

          const notes = await parser.parse(file)
          totalNotes += notes.length

          // Update total notes count
          setProgress(prev => ({
            ...prev,
            totalNotes: totalNotes
          }))

          for (let noteIndex = 0; noteIndex < notes.length; noteIndex++) {
            const note = notes[noteIndex]
            
            // Throttle localStorage updates - save every 2 seconds or on last note
            const now = Date.now()
            const isLastNote = noteIndex === notes.length - 1
            if (now - lastSaveTime > SAVE_INTERVAL || isLastNote) {
              localStorage.setItem(IMPORT_STATE_KEY, JSON.stringify({
                currentFile: fileIndex + 1,
                totalFiles: files.length,
                currentNote: successCount + errorCount,
                totalNotes,
                successCount,
                errorCount,
                fileName: file.name
              }))
              lastSaveTime = now
            }
            
            try {
              const noteId = crypto.randomUUID()

              const convertedContent = await converter.convert(
                note.content,
                note.resources,
                user.id,
                noteId
              )

              await noteCreator.create(
                {
                  ...note,
                  content: convertedContent
                },
                user.id,
                settings.duplicateStrategy
              )

              successCount++
              
              // Update note progress
              setProgress(prev => ({
                ...prev,
                currentNote: successCount + errorCount
              }))
            } catch (error) {
              console.error('Failed to import note:', note.title, error)
              errorCount++
              
              // Collect failed note details
              failedNotes.push({
                title: note.title || 'Untitled',
                error: error.message || 'Unknown error'
              })
              
              // Update note progress even on error
              setProgress(prev => ({
                ...prev,
                currentNote: successCount + errorCount
              }))
            }
          }
        } catch (error) {
          console.error('Failed to process file:', file.name, error)
          toast.error(`Failed to process ${file.name}: ${error.message}`)
          errorCount++
        }
      }

      // Clear saved state on successful completion
      localStorage.removeItem(IMPORT_STATE_KEY)

      // Set result and keep dialog open
      const result = {
        success: successCount,
        errors: errorCount,
        failedNotes: failedNotes,
        message: successCount > 0 
          ? `Successfully imported ${successCount} note${successCount > 1 ? 's' : ''}`
          : errorCount > 0 
            ? 'All imports failed'
            : 'No notes were imported'
      }
      setImportResult(result)

      // Call onImportComplete with status
      if (successCount > 0) {
        const status = errorCount > 0 ? 'partial' : 'success'
        onImportComplete?.(status, { successCount, errorCount })
      }
    } catch (error) {
      console.error('Import failed:', error)
      localStorage.removeItem(IMPORT_STATE_KEY)
      
      // Set error result
      setImportResult({
        success: successCount,
        errors: errorCount + 1,
        failedNotes: failedNotes,
        message: `Import failed: ${error.message}`
      })
    } finally {
      setImporting(false)
    }
  }

  const handleCloseProgressDialog = () => {
    setProgressDialogOpen(false)
    setImportResult(null)
    // Reset progress
    setProgress({
      currentFile: 0,
      totalFiles: 0,
      currentNote: 0,
      totalNotes: 0,
      fileName: ''
    })
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
        {importing ? 'Importing...' : 'Import from Evernote'}
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
