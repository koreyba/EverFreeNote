"use client"

import * as React from 'react'
import { ClockCounterClockwise, DotsThree as MoreHorizontal, ShareNetwork as Share2, Trash as Trash2 } from "@phosphor-icons/react"
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
import { ShareNoteDialog } from '@/components/features/notes/ShareNoteDialog'
import { NoteVersionHistoryDialog, type NoteVersionHistoryOptions } from '@/components/features/notes/NoteVersionHistoryDialog'

interface MoreActionsMenuProps {
  noteId: string
  wordpressConfigured?: boolean
  getExportNote: () => ExportableWordPressNote | null
  onDelete?: () => void
  versionHistory?: NoteVersionHistoryOptions
}

export function MoreActionsMenu({
  noteId,
  wordpressConfigured = false,
  getExportNote,
  onDelete,
  versionHistory,
}: MoreActionsMenuProps) {
  const moreActionsButton = React.useRef<HTMLButtonElement>(null)
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false)
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [exportDialogNote, setExportDialogNote] = React.useState<ExportableWordPressNote | null>(null)

  const handleExportRequest = React.useCallback((exportNote: ExportableWordPressNote) => {
    setExportDialogNote(exportNote)
    setExportDialogOpen(true)
  }, [])

  return (
    <>
      <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button ref={moreActionsButton} variant="ghost" size="icon" className="h-11 w-11 rounded-xl shadow-none md:h-9 md:w-9" data-cy="note-more-button" aria-label="More actions">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              setMoreMenuOpen(false)
              setShareDialogOpen(true)
            }}
          >
            <Share2 />
            Share note
          </DropdownMenuItem>
          {versionHistory && (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                setMoreMenuOpen(false)
                setHistoryDialogOpen(true)
              }}
            >
              <ClockCounterClockwise />
              Version history
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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
      <ShareNoteDialog noteId={noteId} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
      {historyDialogOpen && versionHistory && (
        <NoteVersionHistoryDialog
          key={noteId}
          noteId={noteId}
          onClose={() => setHistoryDialogOpen(false)}
          onCloseAutoFocus={event => {
            event.preventDefault()
            moreActionsButton.current?.focus({ preventScroll: true })
          }}
          {...versionHistory}
        />
      )}
      {exportDialogNote ? (
        <WordPressExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} note={exportDialogNote} />
      ) : null}
    </>
  )
}
