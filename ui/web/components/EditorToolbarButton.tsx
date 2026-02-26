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
        size="sm"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)
