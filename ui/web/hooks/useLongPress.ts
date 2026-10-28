import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface UseLongPressOptions {
  delayMs?: number
  moveThresholdPx?: number
  enabled?: boolean
}

export function useLongPress(
  onLongPress: () => void,
  {
    delayMs = 500,
    moveThresholdPx = 10,
    enabled = true,
  }: UseLongPressOptions = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggeredRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const cancelLongPress = useCallback(() => {
    clearTimer()
    startPointRef.current = null
  }, [clearTimer])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    // A new gesture supersedes any long press whose browser click never arrived.
    longPressTriggeredRef.current = false
    if (!enabled) return
    if (event.pointerType === 'mouse') return

    startPointRef.current = { x: event.clientX, y: event.clientY }
    clearTimer()

    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onLongPress()
      cancelLongPress()
    }, delayMs)
  }, [enabled, delayMs, onLongPress, clearTimer, cancelLongPress])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = startPointRef.current
    if (!enabled || !start || !timerRef.current) return

    const movedX = Math.abs(event.clientX - start.x)
    const movedY = Math.abs(event.clientY - start.y)
    if (movedX > moveThresholdPx || movedY > moveThresholdPx) {
      cancelLongPress()
    }
  }, [enabled, moveThresholdPx, cancelLongPress])

  const consumeLongPress = useCallback(() => {
    const wasTriggered = longPressTriggeredRef.current
    longPressTriggeredRef.current = false
    return wasTriggered
  }, [])

  useEffect(() => {
    if (!enabled) cancelLongPress()
  }, [cancelLongPress, enabled])

  useEffect(() => {
    return () => {
      clearTimer()
      startPointRef.current = null
      longPressTriggeredRef.current = false
    }
  }, [clearTimer])

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancelLongPress,
      onPointerLeave: cancelLongPress,
      onPointerCancel: cancelLongPress,
    },
    consumeLongPress,
  }
}
