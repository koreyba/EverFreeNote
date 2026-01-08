"use client"

import * as React from "react"
import { cn } from "@ui/web/lib/utils"

type HorizontalTagScrollProps = {
  children: React.ReactNode
  className?: string
}

export const HorizontalTagScroll = React.forwardRef<HTMLDivElement, HorizontalTagScrollProps>(
  function HorizontalTagScroll({ children, className }, ref) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Merge external ref with internal ref
  React.useImperativeHandle(ref, () => scrollContainerRef.current as HTMLDivElement)

  // Drag-to-scroll state
  const isDraggingRef = React.useRef(false)
  const startXRef = React.useRef(0)
  const scrollLeftRef = React.useRef(0)
  const hasDraggedRef = React.useRef(false)

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      e.preventDefault()
      scrollContainerRef.current.scrollLeft += e.deltaY
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    isDraggingRef.current = true
    hasDraggedRef.current = false
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft
    scrollContainerRef.current.style.cursor = "grabbing"
    scrollContainerRef.current.style.userSelect = "none"
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = x - startXRef.current
    if (Math.abs(walk) > 3) {
      hasDraggedRef.current = true
    }
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk
  }

  const handleMouseUp = () => {
    if (!scrollContainerRef.current) return
    isDraggingRef.current = false
    scrollContainerRef.current.style.cursor = "grab"
    scrollContainerRef.current.style.userSelect = ""
  }

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      handleMouseUp()
    }
  }

  // Prevent click events on children when dragging
  const handleClick = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      hasDraggedRef.current = false
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "flex items-center gap-2 overflow-x-scroll scrollbar-none cursor-grab",
        className
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClickCapture={handleClick}
    >
      {children}
    </div>
  )
})
