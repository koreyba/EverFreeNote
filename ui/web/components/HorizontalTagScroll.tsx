"use client"

import * as React from "react"
import { cn } from "@ui/web/lib/utils"

type HorizontalTagScrollProps = {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export const HorizontalTagScroll = React.forwardRef<HTMLDivElement, HorizontalTagScrollProps>(
  function HorizontalTagScroll({ children, className, onClick }, ref) {
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

  React.useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !scrollContainerRef.current) return
      
      const x = e.pageX - scrollContainerRef.current.offsetLeft
      const walk = x - startXRef.current
      
      if (Math.abs(walk) > 3) {
        if (!hasDraggedRef.current) {
          hasDraggedRef.current = true
          scrollContainerRef.current.style.cursor = "grabbing"
          scrollContainerRef.current.style.userSelect = "none"
        }
      }
      
      if (hasDraggedRef.current) {
        e.preventDefault()
        scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk
      }
    }

    const handleGlobalPointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        if (scrollContainerRef.current) {
          scrollContainerRef.current.style.cursor = ""
          scrollContainerRef.current.style.userSelect = ""
        }
      }
    }

    window.addEventListener("pointermove", handleGlobalPointerMove)
    window.addEventListener("pointerup", handleGlobalPointerUp)
    window.addEventListener("pointercancel", handleGlobalPointerUp)

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove)
      window.removeEventListener("pointerup", handleGlobalPointerUp)
      window.removeEventListener("pointercancel", handleGlobalPointerUp)
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!scrollContainerRef.current) return
    isDraggingRef.current = true
    hasDraggedRef.current = false
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft
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
    <div // NOSONAR
      ref={scrollContainerRef}
      className={cn(
        "flex items-center gap-2 overflow-x-auto cursor-grab hide-all-scrollbars",
        className
      )}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClick}
      onClick={onClick}
    >
      {children}
    </div>
  )
})
