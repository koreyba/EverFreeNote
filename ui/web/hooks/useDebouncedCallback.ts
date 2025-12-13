import { useCallback, useEffect, useRef } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
  const fnRef = useRef(fn)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const callback = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      fnRef.current(...args)
    }, delayMs)
  }, [delayMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return callback as T
}

