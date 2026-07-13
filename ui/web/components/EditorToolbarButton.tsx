"use client"

import * as React from "react"
import { Button } from "@ui/web/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/web/components/ui/tooltip"

export type EditorToolbarButtonProps = {
  dataCy: string
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
  children: React.ReactNode
}

export const EditorToolbarButton = ({
  dataCy,
  label,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  children,
}: EditorToolbarButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        data-cy={dataCy}
        variant={active ? "secondary" : "ghost"}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0"
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)
