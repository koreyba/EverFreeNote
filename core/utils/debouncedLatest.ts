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
  let inFlight: Promise<void> | null = null
  let inFlightValue: T | null = null

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const areEqual = (left: T, right: T) => (
    isEqual ? isEqual(left, right) : Object.is(left, right)
  )

  const shouldSkip = (next: T) => {
    if (lastFlushed === null) return false
    return areEqual(lastFlushed, next)
  }

  const flushNow = async () => {
    if (inFlight) return inFlight
    if (pending === null) return

    const next = pending
    pending = null

    if (shouldSkip(next)) {
      // Keep baseline as-is.
      return
    }

    inFlightValue = next
    inFlight = (async () => {
      try {
        await onFlush(next)
        lastFlushed = next

        if (pending !== null && shouldSkip(pending)) {
          pending = null
          clearTimer()
        }
      } catch (error) {
        if (pending === null) {
          queuePending(next)
        }
        throw error
      } finally {
        inFlight = null
        inFlightValue = null

        if (pending !== null && timer === null && !shouldSkip(pending)) {
          queuePending(pending, { restartTimer: false })
        }
      }
    })()

    return inFlight
  }

  const queuePending = (nextPending: T | null, options: { restartTimer?: boolean } = {}) => {
    pending = nextPending

    if (pending === null || shouldSkip(pending)) {
      pending = null
      clearTimer()
      return
    }

    if (inFlightValue !== null && areEqual(inFlightValue, pending)) {
      clearTimer()
      return
    }

    if (options.restartTimer === false && timer !== null) {
      return
    }

    clearTimer()
    timer = setTimeout(() => {
      timer = null
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

    rebase: (base: T, nextPending?: T | null) => {
      lastFlushed = base
      // Default behavior: keep the current pending draft when caller omits nextPending.
      queuePending(nextPending === undefined ? pending : nextPending, { restartTimer: false })
    },

    getBaseline: () => lastFlushed,

    getPending: () => pending,
  }
}
