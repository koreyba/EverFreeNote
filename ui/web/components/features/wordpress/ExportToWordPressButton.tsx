"use client"

import * as React from "react"
import { Upload } from "lucide-react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export type ExportableWordPressNote = {
  id: string
  title: string
  description: string
  tags: string[]
}

type ExportToWordPressButtonProps = {
  getNote: () => ExportableWordPressNote | null
  onRequestExport: (note: ExportableWordPressNote) => void
  disabled?: boolean
  className?: string
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  label?: string
  triggerVariant?: "button" | "menu-item"
}

export function ExportToWordPressButton({
  getNote,
  onRequestExport,
  disabled = false,
  className,
  variant = "outline",
  size = "sm",
  label = "Export to WP",
  triggerVariant = "button",
}: ExportToWordPressButtonProps) {
  const requestExport = () => {
    const nextNote = getNote()
    if (!nextNote?.id) return

    onRequestExport(nextNote)
  }

  return (
    <>
      {triggerVariant === "menu-item" ? (
        <DropdownMenuItem onSelect={requestExport} disabled={disabled} className={className}>
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </DropdownMenuItem>
      ) : (
        <Button onClick={requestExport} variant={variant} size={size} className={className} disabled={disabled}>
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </Button>
      )}
    </>
  )
}
