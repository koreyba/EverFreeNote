import { Suspense } from "react"

import { SettingsPage } from "@/components/features/settings/SettingsPage"

export default function SettingsRoute() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPage />
    </Suspense>
  )
}

function SettingsPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20">
      <p className="text-sm text-muted-foreground">Loading settings...</p>
    </main>
  )
}
