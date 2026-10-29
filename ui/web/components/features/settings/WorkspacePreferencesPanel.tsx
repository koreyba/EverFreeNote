'use client'

import { Switch } from '@/components/ui/switch'
import { useSplitViewPreference } from '@ui/web/providers/SplitViewPreferenceProvider'

export function WorkspacePreferencesPanel() {
  const { enabled, ready, persisted, setEnabled } = useSplitViewPreference()
  return (
    <div className="rounded-2xl border border-border/40 bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Workspace</h3>
          <label htmlFor="settings-split-view" className="mt-3 block text-sm font-medium">Split view</label>
          <p id="settings-split-view-description" className="mt-1 text-sm text-muted-foreground">
            Open two notes side by side on desktop. This setting applies to this browser.
          </p>
        </div>
        <Switch id="settings-split-view" checked={enabled} disabled={!ready} onCheckedChange={setEnabled}
          aria-describedby="settings-split-view-description" className="mt-9" />
      </div>
      {!persisted && (
        <p role="status" className="mt-3 text-sm text-destructive">
          This setting could not be saved and may reset when you reload or close this tab.
        </p>
      )}
    </div>
  )
}
