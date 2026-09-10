import { useCallback, useEffect, useMemo, useRef } from 'react'

export type DebouncedSessionCallback<T> = {
  schedule: (value: T) => void
  cancel: () => void
  flush: () => void
}

/**
 * Debounces high-frequency editor/reader session updates (scroll, typing draft)
 * before they reach workspace-tab state, so per-event React updates and
 * sessionStorage serialization do not run on every scroll frame or keystroke.
 *
 * `onUnmount` decides what happens to a pending value when the component goes
 * away: reading scroll must be flushed (there is no other capture path), while
 * draft updates must be cancelled because every tab transition captures the
 * live editor synchronously first and a late flush would re-mark a
 * just-saved tab as dirty.
 */
export function useDebouncedSessionCallback<T>(
  callback: ((value: T) => void) | undefined,
  delayMs: number,
  // Treated as fixed for the lifetime of the component.
  onUnmount: 'flush' | 'cancel',
): DebouncedSessionCallback<T> {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<{ value: T } | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingRef.current = null
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) callbackRef.current?.(pending.value)
  }, [])

  const schedule = useCallback((value: T) => {
    pendingRef.current = { value }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, delayMs)
  }, [delayMs, flush])

  const onUnmountRef = useRef(onUnmount)

  useEffect(() => () => {
    if (onUnmountRef.current === 'flush') {
      flush()
    } else {
      cancel()
    }
  }, [cancel, flush])

  return useMemo(() => ({ schedule, cancel, flush }), [schedule, cancel, flush])
}
