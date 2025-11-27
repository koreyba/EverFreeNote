"use client"

import * as React from "react"
import { FileText, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { DuplicateStrategy } from "@/lib/enex/types"

type ImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (files: File[], settings: { duplicateStrategy: DuplicateStrategy }) => void
}

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [duplicateStrategy, setDuplicateStrategy] =
    React.useState<DuplicateStrategy>("prefix")
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".enex")
    )
    setSelectedFiles(files)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".enex")
    )
    setSelectedFiles(files)
  }

  const handleImport = () => {
    if (selectedFiles.length === 0) return
    onImport(selectedFiles, { duplicateStrategy })
    setSelectedFiles([])
    onOpenChange(false)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((files) => files.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import from Evernote</DialogTitle>
          <DialogDescription>
            Drag and drop .enex files or click to browse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            } ${selectedFiles.length > 0 ? "bg-muted/30" : ""}`}
          >
            <input
              type="file"
              multiple
              accept=".enex"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {isDragging ? "Drop files here" : "Drag & drop .enex files"}
            </p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Selected files ({selectedFiles.length})
              </Label>
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="h-6 px-2"
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Import Settings</Label>

            {/* Duplicate Strategy */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                What to do with duplicate notes?
              </Label>
              <RadioGroup
                value={duplicateStrategy}
                onValueChange={(value: DuplicateStrategy) =>
                  setDuplicateStrategy(value)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prefix" id="prefix" />
                  <Label
                    htmlFor="prefix"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Add [duplicate] prefix to title
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label
                    htmlFor="skip"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Skip duplicate notes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label
                    htmlFor="replace"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Replace existing notes
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={selectedFiles.length === 0}>
              Import {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
