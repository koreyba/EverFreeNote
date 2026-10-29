export type DebouncedLatestOptions<T> = {
  delayMs: number
  onFlush: (value: T) => void | Promise<void>
  isEqual?: (a: T, b: T) => boolean
}

export type DebouncedLatest<T> = {
  schedule: (next: T, options?: { force?: boolean }) => void
  flush: () => Promise<void>
  cancel: () => void
  reset: (base: T) => void
  rebase: (base: T, nextPending?: T | null, options?: { supersedeInFlight?: boolean }) => void
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
  let baselineRevision = 0
  let sessionRevision = 0
  let needsRetry = false

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const areEqual = (left: T, right: T) => (
    isEqual ? isEqual(left, right) : Object.is(left, right)
  )

  const shouldSkip = (next: T) => {
    if (needsRetry || lastFlushed === null) return false
    return areEqual(lastFlushed, next)
  }

  const flushNow = async () => {
    if (inFlight) return inFlight
    if (pending === null) return

    const next = pending
    const flushRevision = baselineRevision
    const flushSessionRevision = sessionRevision
    pending = null

    if (shouldSkip(next)) {
      // Keep baseline as-is.
      return
    }

    inFlightValue = next
    inFlight = (async () => {
      try {
        await onFlush(next)
        if (sessionRevision === flushSessionRevision) needsRetry = false
        if (baselineRevision === flushRevision) {
          lastFlushed = next
        }

        if (pending !== null && shouldSkip(pending)) {
          pending = null
          clearTimer()
        }
      } catch (error) {
        if (sessionRevision === flushSessionRevision) {
          // A failed write may have partially changed storage. Even a draft
          // matching the previous baseline must be written again on retry.
          needsRetry = true
          if (pending === null) queuePending(next)
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

    // A value equal to the old baseline may still need to be written after a
    // different in-flight value (for example, undoing an edit during a save).
    if (pending === null || (inFlightValue === null && shouldSkip(pending))) {
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
      // Callers of explicit flush receive errors; timer-triggered failures are
      // already surfaced by onFlush and leave the draft queued for retry.
      void flushNow().catch(() => {})
    }, delayMs)
  }

  const flushAll = async () => {
    clearTimer()
    // A transition must wait for the newest draft, including edits scheduled
    // while an earlier write is in flight. Only one write runs at a time.
    while (inFlight !== null || pending !== null) {
      await flushNow()
      clearTimer()
    }
  }

  return {
    schedule: (next: T, options?: { force?: boolean }) => {
      if (options?.force) needsRetry = true
      queuePending(next)
    },

    flush: flushAll,

    cancel: () => {
      clearTimer()
      pending = null
      needsRetry = false
    },

    reset: (base: T) => {
      clearTimer()
      pending = null
      baselineRevision += 1
      sessionRevision += 1
      needsRetry = false
      lastFlushed = base
    },

    rebase: (base: T, nextPending?: T | null, options?: { supersedeInFlight?: boolean }) => {
      baselineRevision += 1
      if (options?.supersedeInFlight) {
        sessionRevision += 1
        needsRetry = false
      }
      lastFlushed = base
      // Default behavior: keep the current pending draft when caller omits nextPending.
      queuePending(nextPending === undefined ? pending : nextPending, { restartTimer: false })
    },

    getBaseline: () => lastFlushed,

    getPending: () => pending,
  }
}
