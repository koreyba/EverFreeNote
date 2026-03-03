"use client"

import * as React from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ExportToWordPressButton,
  type ExportableWordPressNote,
} from '@/components/features/wordpress/ExportToWordPressButton'
import { WordPressExportDialog } from '@/components/features/wordpress/WordPressExportDialog'
import { RagIndexPanel } from '@/components/features/notes/RagIndexPanel'

interface MoreActionsMenuProps {
  noteId: string
  wordpressConfigured?: boolean
  getExportNote: () => ExportableWordPressNote | null
  onDelete?: () => void
}

export function MoreActionsMenu({
  noteId,
  wordpressConfigured = false,
  getExportNote,
  onDelete,
}: MoreActionsMenuProps) {
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [exportDialogNote, setExportDialogNote] = React.useState<ExportableWordPressNote | null>(null)

  const handleExportRequest = React.useCallback((exportNote: ExportableWordPressNote) => {
    setExportDialogNote(exportNote)
    setExportDialogOpen(true)
  }, [])

  return (
    <>
      <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <RagIndexPanel noteId={noteId} variant="menu" onMenuClose={() => setMoreMenuOpen(false)} />
          {wordpressConfigured && (
            <>
              <DropdownMenuSeparator />
              <ExportToWordPressButton
                getNote={getExportNote}
                onRequestExport={handleExportRequest}
                triggerVariant="menu-item"
              />
            </>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <Trash2 />
                Delete note
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {exportDialogNote ? (
        <WordPressExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} note={exportDialogNote} />
      ) : null}
    </>
  )
}
