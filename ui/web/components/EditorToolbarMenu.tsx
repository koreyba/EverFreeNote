"use client"

import * as React from "react"
import { CaretDown } from "@phosphor-icons/react"
import { Button } from "./ui/button"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu"
import type { ToolbarFocusOrigin } from "@ui/web/hooks/useToolbarFocus"

type MenuOption = { value: string; label: string; apply: (origin: ToolbarFocusOrigin) => void }
type EditorToolbarMenuProps = {
  label: string
  children: React.ReactNode
  onOpen: () => void
} & ({ multiple?: false; value: string; options: MenuOption[] }
  | { multiple: true; value?: never; options: (MenuOption & { checked: boolean })[] })

export function EditorToolbarMenu(props: EditorToolbarMenuProps) {
  const { label, children } = props
  const applied = React.useRef(false)
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const apply = (option: MenuOption) => {
    applied.current = true
    option.apply({ trigger: triggerRef.current, content: contentRef.current })
  }
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={next => {
      if (next) {
        props.onOpen()
        applied.current = false
      }
      setOpen(next)
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant={props.multiple && props.options.some(option => option.checked) ? "secondary" : "ghost"}
          aria-label={label}
          className="h-11 min-w-11 shrink-0 gap-1 rounded-lg px-2"
          // Radix normally opens on pointerdown, before a swipe can be detected.
          onPointerDown={event => event.preventDefault()}
          onClick={() => { props.onOpen(); applied.current = false; setOpen(current => !current) }}
        >
          {children}
          <CaretDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={contentRef}
        side="top"
        align="start"
        onCloseAutoFocus={event => {
          // A command restores the editor selection and focus. Dismissing the
          // menu without a command still returns focus to its trigger.
          if (applied.current) event.preventDefault()
        }}
      >
        {props.multiple ? props.options.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={option.checked}
            className="min-h-11"
            onSelect={() => apply(option)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        )) : <DropdownMenuRadioGroup value={props.value}>
          {props.options.map(option => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="min-h-11"
              onSelect={() => apply(option)}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
