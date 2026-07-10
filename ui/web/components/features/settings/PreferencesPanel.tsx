"use client"

import * as React from "react"
import { Sliders } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export const SPELLCHECK_ENABLED_KEY = "editor_spellcheck_enabled"

export function PreferencesPanel() {
  const [spellcheckEnabled, setSpellcheckEnabled] = React.useState(true)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SPELLCHECK_ENABLED_KEY)
      if (stored !== null) {
        setSpellcheckEnabled(stored !== "false")
      }
    } catch {
      // Fallback to true if storage is blocked/disabled
      setSpellcheckEnabled(true)
    }
  }, [])

  const handleToggle = (checked: boolean) => {
    setSpellcheckEnabled(checked)
    try {
      localStorage.setItem(SPELLCHECK_ENABLED_KEY, String(checked))
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4 sm:p-5">
        <div className="space-y-1 pr-4">
          <Label htmlFor="spellcheck-toggle" className="text-base font-semibold leading-none">
            Editor Spellcheck
          </Label>
          <p className="text-sm text-muted-foreground leading-normal">
            Enable browser-native spelling checking while editing note bodies.
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
