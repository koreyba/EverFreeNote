"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"

interface AlphabeticalGridProps {
  readonly availableLetters: string[]
  readonly selectedLetter: string | null
  readonly onSelectLetter: (...args: [string | null]) => void
  readonly onJumpToLetter?: (...args: [string]) => void
  readonly className?: string
}

export function AlphabeticalGrid({
  availableLetters,
  selectedLetter,
  onSelectLetter,
  onJumpToLetter,
  className,
}: AlphabeticalGridProps) {
  const handleClickLetter = (letter: string) => {
    onSelectLetter(letter)
    if (onJumpToLetter) {
      onJumpToLetter(letter)
    }
  }

  return (
    <div
      data-testid="alphabetical-grid"
      className={cn(
        "flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none max-w-full touch-pan-x sm:flex-wrap",
        className
      )}
    >
      <Button
        variant={selectedLetter === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelectLetter(null)}
        className="h-7 text-xs px-3 rounded-full shrink-0 font-medium transition-all"
      >
        All
      </Button>

      {availableLetters.map((letter) => {
        const isSelected = selectedLetter === letter
        return (
          <Button
            key={letter}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => handleClickLetter(letter)}
            className={cn(
              "h-7 min-w-[32px] text-xs px-2.5 rounded-full shrink-0 font-medium transition-all",
              isSelected && "shadow-sm"
            )}
            data-testid={`letter-jump-${letter}`}
          >
            {letter}
          </Button>
        )
      })}
    </div>
  )
}
