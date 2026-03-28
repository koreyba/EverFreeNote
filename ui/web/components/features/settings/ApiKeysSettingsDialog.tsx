"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ApiKeysSettingsPanel } from "@/components/features/settings/ApiKeysSettingsPanel"

type ApiKeysSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeysSettingsDialog({ open, onOpenChange }: ApiKeysSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-[480px] sm:p-6">
        <DialogHeader>
          <DialogTitle>Indexing (RAG)</DialogTitle>
          <DialogDescription>
            API credentials are encrypted before storage and never exposed in plain text.
          </DialogDescription>
        </DialogHeader>
        <ApiKeysSettingsPanel onClose={() => onOpenChange(false)} showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
