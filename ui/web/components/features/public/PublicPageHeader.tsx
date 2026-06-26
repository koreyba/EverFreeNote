"use client"

import { BrandLogo } from "@/components/BrandLogo"
import { ThemeToggle } from "@/components/theme-toggle"

export function PublicPageHeader() {
  return (
    <header
      data-testid="public-page-header"
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrandLogo className="h-6 w-6 shrink-0" alt="" />
          <span>EverFreeNote</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
