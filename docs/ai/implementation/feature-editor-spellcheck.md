---
phase: implementation
title: Implementation Guide - Editor Spellcheck
description: Technical guidelines and code details for implementing editor spellcheck
---

# Implementation Guide - Editor Spellcheck

## Development Setup
- No external dependencies are required. We make use of browser-native storage (`localStorage`) and standard contenteditable capabilities (`spellcheck` attribute).

## Code Structure
- `ui/web/components/features/settings/PreferencesPanel.tsx` [NEW]: Contains preferences-related UI panel.
- `ui/web/components/features/settings/SettingsPage.tsx` [MODIFY]: Add preferences tab.
- `ui/web/components/RichTextEditor.tsx` [MODIFY]: Pass `spellcheck` attribute to Tiptap editor.
- `ui/web/components/RichTextEditorWebView.tsx` [MODIFY]: Pass `spellcheck` attribute to Tiptap editor.

## Implementation Details

### PreferencesPanel
```typescript
import * as React from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export const SPELLCHECK_ENABLED_KEY = "editor_spellcheck_enabled"

export function PreferencesPanel() {
  const [spellcheckEnabled, setSpellcheckEnabled] = React.useState(true)

  React.useEffect(() => {
    const stored = localStorage.getItem(SPELLCHECK_ENABLED_KEY)
    if (stored !== null) {
      setSpellcheckEnabled(stored !== "false")
    }
  }, [])

  const handleToggle = (checked: boolean) => {
    setSpellcheckEnabled(checked)
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, String(checked))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="spellcheck-toggle" className="text-base font-semibold">
            Spellcheck
          </Label>
          <p className="text-sm text-muted-foreground">
            Enable browser-native spelling checking in the editor.
          </p>
        </div>
        <Switch
          id="spellcheck-toggle"
          checked={spellcheckEnabled}
          onCheckedChange={handleToggle}
        />
      </div>
    </div>
  )
}
```

### Editor Integration
In the editor files, read the `SPELLCHECK_ENABLED_KEY` setting from `localStorage` on mount:
```typescript
const [spellcheckEnabled, setSpellcheckEnabled] = React.useState(true)

React.useEffect(() => {
  const stored = localStorage.getItem("editor_spellcheck_enabled")
  if (stored !== null) {
    setSpellcheckEnabled(stored !== "false")
  }
}, [])
```

And in `useMemo` for `editorProps`:
```typescript
const editorProps = React.useMemo(() => ({
  attributes: {
    class: "focus:outline-none",
    spellcheck: spellcheckEnabled ? "true" : "false",
  },
  ...
}), [spellcheckEnabled, ...])
```
