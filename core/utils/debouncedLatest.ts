export type DebouncedLatestOptions<T> = {
  delayMs: number
  onFlush: (value: T) => void | Promise<void>
  isEqual?: (a: T, b: T) => boolean
}

export type DebouncedLatest<T> = {
  schedule: (next: T) => void
  flush: () => Promise<void>
  cancel: () => void
  reset: (base: T) => void
  getPending: () => T | null
}

/**
 * Debounces writes of the latest value and provides an explicit flush() API.
 *
 * Invariants:
 * - If a debounced flush already ran, subsequent flush() does nothing until schedule() is called again.
 * - flush() cancels the timer to avoid double-saves (timer + flush).
 * - reset(base) cancels pending work and sets the last-flushed baseline for equality checks.
 */
export function createDebouncedLatest<T>(options: DebouncedLatestOptions<T>): DebouncedLatest<T> {
  const { delayMs, onFlush, isEqual } = options

  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: T | null = null
  let lastFlushed: T | null = null

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const shouldSkip = (next: T) => {
    if (!isEqual) return false
    if (lastFlushed === null) return false
    return isEqual(lastFlushed, next)
  }

  const flushNow = async () => {
    clearTimer()
    if (pending === null) return

    const next = pending
    pending = null

    if (shouldSkip(next)) {
      // Keep baseline as-is.
      return
    }

    await onFlush(next)
    lastFlushed = next
  }

  return {
    schedule: (next: T) => {
      pending = next

      // If the new pending value equals the baseline, cancel any pending work.
      if (shouldSkip(next)) {
        pending = null
        clearTimer()
        return
      }

      clearTimer()
      timer = setTimeout(() => {
        // Fire-and-forget; callers should handle errors in onFlush.
        void flushNow()
      }, delayMs)
    },

    flush: flushNow,

    cancel: () => {
      clearTimer()
      pending = null
    },

    reset: (base: T) => {
      clearTimer()
      pending = null
      lastFlushed = base
    },

    getPending: () => pending,
  }
}
