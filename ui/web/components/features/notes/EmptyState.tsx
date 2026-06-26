"use client"

import { BrandLogo } from "@/components/BrandLogo"

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <BrandLogo className="mx-auto mb-4 h-20 w-20 opacity-70" />
        <p className="text-lg">Select a note or create a new one</p>
      </div>
    </div>
  )
}
