import * as React from "react"

/** Keep touch scrolling native; add mouse dragging and suppress drag-end clicks. */
export function useToolbarDrag(enabled: boolean) {
  const ref = React.useRef<HTMLDivElement>(null)
  const gesture = React.useRef<{
    id: number; x: number; y: number; left: number; mouse: boolean; moved: boolean; down: boolean
  } | null>(null)

  React.useEffect(() => {
    if (!enabled) return
    const element = ref.current
    if (!element) return
    const doc = element.ownerDocument
    const move = (event: PointerEvent) => {
      const current = gesture.current
      if (!current?.down || current.id !== event.pointerId) return
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      if (Math.hypot(dx, dy) > 8) current.moved = true
      if (current.mouse && current.moved) {
        event.preventDefault()
        element.scrollLeft = current.left - dx
      }
    }
    const finish = (event: PointerEvent) => {
      const current = gesture.current
      if (current?.id !== event.pointerId) return
      current.down = false
      if (event.type === "pointercancel") current.moved = true
    }
    doc.addEventListener("pointermove", move, { passive: false })
    doc.addEventListener("pointerup", finish)
    doc.addEventListener("pointercancel", finish)
    return () => {
      doc.removeEventListener("pointermove", move)
      doc.removeEventListener("pointerup", finish)
      doc.removeEventListener("pointercancel", finish)
      gesture.current = null
    }
  }, [enabled])

  return {
    ref,
    onPointerDownCapture: (event: React.PointerEvent<HTMLDivElement>) => {
      // Portalled menu events bubble through React but do not belong to the row.
      if (!enabled || !event.isPrimary || event.button !== 0 || !event.currentTarget.contains(event.target as Node)) return
      gesture.current = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        left: event.currentTarget.scrollLeft, mouse: event.pointerType === "mouse",
        moved: false, down: true,
      }
    },
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (enabled && gesture.current?.moved && event.detail > 0 && event.currentTarget.contains(event.target as Node)) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
  }
}
