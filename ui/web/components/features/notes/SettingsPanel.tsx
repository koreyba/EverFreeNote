"use client"

import { Settings } from "lucide-react"
import { ImportButton } from "@/components/ImportButton"
import { ExportButton } from "@/components/ExportButton"

type SettingsPanelProps = {
  onImportComplete: () => void
  onExportComplete?: (success: boolean, exportedCount: number) => void
}

export function SettingsPanel({ onImportComplete, onExportComplete }: SettingsPanelProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
          <Settings className="w-4 h-4" />
        </span>
        <div className="leading-tight">
          <div className="text-foreground">Workspace</div>
          <div className="text-xs text-muted-foreground">Import/Export and quick utilities</div>
        </div>
      </div>
      <div className="space-y-2">
        <ImportButton onImportComplete={onImportComplete} />
        <ExportButton onExportComplete={onExportComplete} />
      </div>
    </div>
  )
}
