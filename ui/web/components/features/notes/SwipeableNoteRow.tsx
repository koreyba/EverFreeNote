"use client"

import * as React from "react"
import { Trash } from "@phosphor-icons/react"

const ACTION_WIDTH = 80
const DIRECTION_THRESHOLD = 10

type Gesture = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  wasOpen: boolean
  direction: "horizontal" | "vertical" | null
}

interface SwipeableNoteRowProps {
  children: React.ReactNode
  title: string
  enabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}

export function SwipeableNoteRow({ children, title, enabled, open, onOpenChange, onDelete }: SwipeableNoteRowProps) {
  const [dragOffset, setDragOffset] = React.useState<number | null>(null)
  const gestureRef = React.useRef<Gesture | null>(null)
  const suppressClickRef = React.useRef(false)
  const deleteButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const isOpen = enabled && open
  const offset = enabled ? (dragOffset ?? (isOpen ? ACTION_WIDTH : 0)) : 0

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    suppressClickRef.current = false
    if (!enabled || event.pointerType === "mouse" || event.isPrimary === false) return
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      wasOpen: isOpen,
      direction: null,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    if (!enabled || !gesture || gesture.pointerId !== event.pointerId) return
    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    if (!gesture.direction) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD) return
      if (Math.abs(dy) >= Math.abs(dx) || (dx > 0 && !gesture.wasOpen)) {
        gesture.direction = "vertical"
        return
      }
      gesture.direction = "horizontal"
      suppressClickRef.current = true
      // Capture keeps the drag active when a finger leaves the row. Synthetic
      // pointer events in component tests do not have an active pointer.
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* no active pointer */ }
    }
    if (gesture.direction !== "horizontal") return
    gesture.lastX = event.clientX
    const nextOffset = (gesture.wasOpen ? ACTION_WIDTH : 0) - dx
    setDragOffset(Math.max(0, Math.min(ACTION_WIDTH, nextOffset)))
  }

  const finishGesture = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!cancelled && gesture.direction === "horizontal") {
      const offsetAtRelease = (gesture.wasOpen ? ACTION_WIDTH : 0) - (gesture.lastX - gesture.startX)
      onOpenChange(offsetAtRelease >= ACTION_WIDTH / 2)
    }
    gestureRef.current = null
    setDragOffset(null)
  }

  return (
    <div
      className="relative h-full overflow-hidden rounded-xl touch-pan-y md:touch-auto"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={(event) => finishGesture(event, true)}
      onClickCapture={(event) => {
        if (deleteButtonRef.current?.contains(event.target as Node)) return
        if (!suppressClickRef.current && !isOpen) return
        event.preventDefault()
        event.stopPropagation()
        if (!suppressClickRef.current && isOpen) onOpenChange(false)
        suppressClickRef.current = false
      }}
    >
      <button
        ref={deleteButtonRef}
        type="button"
        aria-label={`Delete note "${title || "Untitled"}"`}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        disabled={!isOpen}
        className="absolute inset-y-0 right-0 flex w-20 flex-col items-center justify-center gap-1 rounded-r-xl bg-destructive text-xs font-semibold text-destructive-foreground md:hidden"
        onClick={() => { onOpenChange(false); onDelete() }}
      >
        <Trash className="h-5 w-5" />
        Delete
      </button>
      <div
        className={dragOffset === null ? "relative h-full bg-card transition-transform duration-200 motion-reduce:transition-none md:bg-transparent" : "relative h-full bg-card md:bg-transparent"}
        style={{ transform: `translateX(-${offset}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
