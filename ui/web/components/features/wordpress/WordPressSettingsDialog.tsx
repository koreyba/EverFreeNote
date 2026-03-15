"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WordPressSettingsPanel } from "@/components/features/settings/WordPressSettingsPanel"

type WordPressSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfiguredChange?: (configured: boolean) => void
}

export function WordPressSettingsDialog({
  open,
  onOpenChange,
  onConfiguredChange,
}: WordPressSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-[560px] sm:p-6">
        <DialogHeader>
          <DialogTitle>WordPress integration</DialogTitle>
          <DialogDescription>
            Configure site URL, username and application password. Export buttons are shown only when integration is
            configured and enabled.
          </DialogDescription>
        </DialogHeader>
        <WordPressSettingsPanel
          onConfiguredChange={onConfiguredChange}
          onClose={() => onOpenChange(false)}
          showCloseButton
        />
      </DialogContent>
    </Dialog>
  )
}
