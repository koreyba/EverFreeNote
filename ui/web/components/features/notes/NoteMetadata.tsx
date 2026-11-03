"use client"

import * as React from "react"
import { Clock, Info, X } from "@phosphor-icons/react"
import { formatDistanceStrict } from "date-fns/formatDistanceStrict"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function editedLabel(updatedAt: string, now: number) {
  const timestamp = new Date(updatedAt).getTime()
  if (!Number.isFinite(timestamp)) return "Date unavailable"
  if (now - timestamp < 60_000) return "Edited just now"
  return `Edited ${formatDistanceStrict(timestamp, now, { addSuffix: true, roundingMethod: "floor" })}`
}

function ExactTimestamp({ value }: { value: string }) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return <>Unavailable</>
  return <time dateTime={value}>{date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
}

export function NoteMetadata({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  const [now, setNow] = React.useState(() => Date.now())
  const [open, setOpen] = React.useState(false)
  const closedByScroll = React.useRef(false)
  const labelId = React.useId()

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const dismiss = () => {
      closedByScroll.current = true
      setOpen(false)
    }
    window.addEventListener("scroll", dismiss, true)
    return () => window.removeEventListener("scroll", dismiss, true)
  }, [open])

  return <div className="mb-6">
    <Popover open={open} onOpenChange={value => { closedByScroll.current = false; setOpen(value) }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Note details" aria-describedby={labelId}
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:min-h-0">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span id={labelId} suppressHydrationWarning>{editedLabel(updatedAt, now)}</span>
          <Info className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} collisionPadding={16}
        aria-label="Note details" className="w-72 max-w-[calc(100vw-2rem)] rounded-xl"
        onCloseAutoFocus={event => {
          // Focusing the trigger after scrolling would jump back to the title.
          if (closedByScroll.current) event.preventDefault()
          closedByScroll.current = false
        }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Note details</h3>
          <button type="button" aria-label="Close note details" onClick={() => setOpen(false)}
            className="-my-2 -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-8 md:w-8">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          <div><dt className="mb-0.5 text-xs text-muted-foreground">Created</dt><dd><ExactTimestamp value={createdAt} /></dd></div>
          <div><dt className="mb-0.5 text-xs text-muted-foreground">Last edited</dt><dd><ExactTimestamp value={updatedAt} /></dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Your local time</p>
      </PopoverContent>
    </Popover>
  </div>
}
