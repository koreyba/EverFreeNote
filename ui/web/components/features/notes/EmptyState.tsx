"use client"

import { BookOpen } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg">Select a note or create a new one</p>
      </div>
    </div>
  )
}
