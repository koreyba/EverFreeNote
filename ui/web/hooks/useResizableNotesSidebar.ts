"use client"

import * as React from "react"

const MIN_WIDTH = 280
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 320
const MIN_EDITOR_WIDTH = 280
const STORAGE_KEY = "notes-sidebar-width"

export function useResizableNotesSidebar(sidebarRef: React.RefObject<HTMLElement | null>) {
  const cleanupRef = React.useRef<(() => void) | null>(null)
  const [preferredWidth, setPreferredWidth] = React.useState(DEFAULT_WIDTH)
  const [maxWidth, setMaxWidth] = React.useState(MAX_WIDTH)
  const [ready, setReady] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const width = Math.min(preferredWidth, maxWidth)

  React.useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY))
      if (saved > 0 && Number.isFinite(saved)) setPreferredWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, saved)))
    } catch { /* The sidebar still resizes when storage is unavailable. */ }
    setReady(true)

    const parent = sidebarRef.current?.parentElement
    let searchPanel: Element | null = null
    const measure = () => {
      const available = parent?.clientWidth || window.innerWidth
      const searchWidth = searchPanel?.getBoundingClientRect().width ?? 0
      const spaceForSidebar = Math.floor(available - searchWidth - MIN_EDITOR_WIDTH)
      setMaxWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(available / 2), spaceForSidebar)))
    }
    const observer = typeof ResizeObserver === "undefined" || !parent ? null : new ResizeObserver(measure)
    if (parent) observer?.observe(parent)
    const observeSearchPanel = () => {
      const nextPanel = parent?.querySelector('[data-notes-search-pane]') ?? null
      if (nextPanel !== searchPanel) {
        if (searchPanel) observer?.unobserve(searchPanel)
        searchPanel = nextPanel
        if (searchPanel) observer?.observe(searchPanel)
      }
      measure()
    }
    const mutationObserver = typeof MutationObserver === "undefined" || !parent ? null : new MutationObserver(observeSearchPanel)
    if (parent) mutationObserver?.observe(parent, { childList: true })
    observeSearchPanel()
    window.addEventListener("resize", measure)
    return () => {
      observer?.disconnect()
      mutationObserver?.disconnect()
      window.removeEventListener("resize", measure)
      cleanupRef.current?.()
    }
  }, [sidebarRef])

  React.useEffect(() => {
    if (!ready || dragging) return
    try { window.localStorage.setItem(STORAGE_KEY, String(preferredWidth)) } catch { /* Keep the in-memory width. */ }
  }, [dragging, preferredWidth, ready])

  const setBoundedWidth = (value: number) => setPreferredWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, value)))

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    cleanupRef.current?.()
    setDragging(true)
    const pointerId = event.pointerId
    const startX = event.clientX
    const startWidth = width
    const originalCursor = document.body.style.cursor
    const originalSelection = document.body.style.userSelect
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) setBoundedWidth(startWidth + moveEvent.clientX - startX)
    }
    const cleanup = () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onFinish)
      document.removeEventListener("pointercancel", onFinish)
      document.body.style.cursor = originalCursor
      document.body.style.userSelect = originalSelection
      cleanupRef.current = null
    }
    const onFinish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return
      cleanup()
      setDragging(false)
    }
    cleanupRef.current = cleanup
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onFinish)
    document.addEventListener("pointercancel", onFinish)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const nextWidth = event.key === "ArrowLeft" ? width - 20
      : event.key === "ArrowRight" ? width + 20
        : event.key === "Home" ? MIN_WIDTH
          : event.key === "End" ? maxWidth
            : null
    if (nextWidth === null) return
    event.preventDefault()
    setBoundedWidth(nextWidth)
  }

  return { width, minWidth: MIN_WIDTH, maxWidth, dragging, onPointerDown, onKeyDown }
}
