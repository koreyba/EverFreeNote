"use client"

import { BrandLogo } from "@/components/BrandLogo"

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-card">
      <div className="text-center flex flex-col items-center select-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-500">
        <BrandLogo className="mb-6 h-24 w-24 opacity-70 drop-shadow-sm motion-safe:animate-pulse" />
        <h3 className="text-xl font-semibold text-foreground/80 mb-2 tracking-tight">No Note Selected</h3>
        <p className="text-sm text-muted-foreground max-w-[250px] mx-auto leading-relaxed">
          Choose a note from the list or create a new one to start writing.
        </p>
      </div>
    </div>
  )
}

