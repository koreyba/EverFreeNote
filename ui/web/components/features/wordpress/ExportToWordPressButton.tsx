"use client"

import * as React from "react"
import { Upload } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { WordPressExportDialog } from "@/components/features/wordpress/WordPressExportDialog"

export type ExportableWordPressNote = {
  id: string
  title: string
  description: string
  tags: string[]
}

type ExportToWordPressButtonProps = {
  getNote: () => ExportableWordPressNote | null
  disabled?: boolean
  className?: string
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  label?: string
}

export function ExportToWordPressButton({
  getNote,
  disabled = false,
  className,
  variant = "outline",
  size = "sm",
  label = "Export to WP",
}: ExportToWordPressButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [noteSnapshot, setNoteSnapshot] = React.useState<ExportableWordPressNote | null>(null)

  const handleOpen = () => {
    const nextNote = getNote()
    if (!nextNote?.id) return

    setNoteSnapshot(nextNote)
    setOpen(true)
  }

  return (
    <>
      <Button onClick={handleOpen} variant={variant} size={size} className={className} disabled={disabled}>
        <Upload className="mr-2 h-4 w-4" />
        {label}
      </Button>

      {noteSnapshot ? (
        <WordPressExportDialog open={open} onOpenChange={setOpen} note={noteSnapshot} />
      ) : null}
    </>
  )
}
