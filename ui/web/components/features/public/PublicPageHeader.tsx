"use client"

import { BookOpen } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

export function PublicPageHeader() {
  return (
    <header
      data-testid="public-page-header"
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <span>EverFreeNote</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
