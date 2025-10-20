'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { EnexParser } from '@/lib/enex/parser'
import { ContentConverter } from '@/lib/enex/converter'
import { ImageProcessor } from '@/lib/enex/image-processor'
import { NoteCreator } from '@/lib/enex/note-creator'
import { createClient } from '@/lib/supabase/client'

export function ImportButton({ onImportComplete }) {
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const handleImportClick = () => {
    console.log('Import button clicked')
    fileInputRef.current?.click()
    console.log('File picker triggered')
  }

  const handleFileSelect = async (event) => {
    console.log('File select triggered', event.target.files)
    const files = Array.from(event.target.files || [])
    if (files.length === 0) {
      console.log('No files selected')
      return
    }

    console.log('Starting import of', files.length, 'files')
    setImporting(true)
    let successCount = 0
    let errorCount = 0

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to import notes')
        setImporting(false)
        return
      }

      const parser = new EnexParser()
      const imageProcessor = new ImageProcessor()
      const converter = new ContentConverter(imageProcessor)
      const noteCreator = new NoteCreator()

      for (const file of files) {
        try {
          const notes = await parser.parse(file)

          for (const note of notes) {
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
                user.id
              )

              successCount++
            } catch (error) {
              console.error('Failed to import note:', note.title, error)
              errorCount++
            }
          }
        } catch (error) {
          console.error('Failed to process file:', file.name, error)
          toast.error(`Failed to process ${file.name}: ${error.message}`)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} note(s)`)
        onImportComplete?.()
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} note(s)`)
      }
    } catch (error) {
      console.error('Import failed:', error)
      toast.error(`Import failed: ${error.message}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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
      <input
        type="file"
        accept=".enex,application/xml,text/xml"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Select .enex files to import"
      />
    </>
  )
}

