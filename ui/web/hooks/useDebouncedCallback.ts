import { useCallback, useEffect, useRef } from "react"

export interface DebouncedCallbackResult<T extends (...args: unknown[]) => void> {
  call: (...args: Parameters<T>) => void
  flush: () => void
  cancel: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delayMs: number): DebouncedCallbackResult<T> {
  const fnRef = useRef(fn)
  const timerRef = useRef<number | null>(null)
  const pendingArgsRef = useRef<Parameters<T> | null>(null)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const flush = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingArgsRef.current !== null) {
      fnRef.current(...pendingArgsRef.current)
      pendingArgsRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingArgsRef.current = null
  }, [])

  const call = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    pendingArgsRef.current = args
    timerRef.current = window.setTimeout(() => {
      fnRef.current(...args)
      pendingArgsRef.current = null
    }, delayMs)
  }, [delayMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return { call, flush, cancel }
}
