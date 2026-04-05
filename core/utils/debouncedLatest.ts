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
  rebase: (base: T, nextPending?: T | null) => void
  getBaseline: () => T | null
  getPending: () => T | null
}

/**
 * Debounces writes of the latest value and provides an explicit flush() API.
 *
 * Invariants:
 * - If a debounced flush already ran, subsequent flush() does nothing until schedule() is called again.
 * - flush() cancels the timer to avoid double-saves (timer + flush).
 * - reset(base) cancels pending work and sets the last-flushed baseline for equality checks.
 * - rebase(base, nextPending) updates the baseline after an external refresh and optionally
 *   keeps a merged pending value alive without treating it as a note switch.
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

    const previousBaseline = lastFlushed
    lastFlushed = next
    try {
      await onFlush(next)
    } catch (error) {
      lastFlushed = previousBaseline
      throw error
    }
  }

  const queuePending = (nextPending: T | null) => {
    pending = nextPending

    if (pending === null || shouldSkip(pending)) {
      pending = null
      clearTimer()
      return
    }

    clearTimer()
    timer = setTimeout(() => {
      void flushNow()
    }, delayMs)
  }

  return {
    schedule: (next: T) => {
      queuePending(next)
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

    rebase: (base: T, nextPending: T | null = pending) => {
      lastFlushed = base
      queuePending(nextPending)
    },

    getBaseline: () => lastFlushed,

    getPending: () => pending,
  }
}
