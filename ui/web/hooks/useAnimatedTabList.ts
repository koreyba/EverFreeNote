import { useEffect, useRef, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Motion shared by the desktop strip and the mobile tab list. */
export const TAB_TRANSITION_MS = 150

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    let query: MediaQueryList
    try {
      query = window.matchMedia(REDUCED_MOTION_QUERY)
    } catch {
      return
    }

    const sync = () => setReduced(query.matches)
    sync()

    // Safari below 14 only has the deprecated listener API.
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', sync)
      return () => query.removeEventListener('change', sync)
    }
    query.addListener(sync)
    return () => query.removeListener(sync)
  }, [])

  return reduced
}

export type AnimatedTabEntry<T> = {
  tab: T
  /** True while the tab is only on screen to play its exit; it is already gone from state. */
  closing: boolean
}

/**
 * Lets a removed tab play an exit before it disappears.
 *
 * The tab is dropped from workspace state immediately — closing is never
 * delayed by the animation. This only keeps a non-interactive copy rendered
 * in the same slot for the length of the exit, so the strip closes the gap
 * smoothly instead of snapping. Nothing lingers when the viewer asked for
 * reduced motion.
 *
 * The exit itself is a CSS keyframe animation (see .note-tab-closing): the
 * copy is created already in its end state, which a transition would have
 * nothing to run from.
 */
export function useAnimatedTabList<T extends { id: string }>(
  tabs: T[],
  durationMs: number = TAB_TRANSITION_MS,
): AnimatedTabEntry<T>[] {
  const reducedMotion = usePrefersReducedMotion()
  const effectiveDuration = reducedMotion ? 0 : durationMs
  const [closingTabs, setClosingTabs] = useState<Array<{ tab: T; index: number }>>([])
  const previousTabsRef = useRef(tabs)

  useEffect(() => {
    const previous = previousTabsRef.current
    previousTabsRef.current = tabs
    if (effectiveDuration <= 0) return

    const removed = previous
      .map((tab, index) => ({ tab, index }))
      .filter(({ tab }) => !tabs.some((candidate) => candidate.id === tab.id))
    if (removed.length === 0) return

    const removedIds = removed.map(({ tab }) => tab.id)
    setClosingTabs((current) => [...current, ...removed])

    const timer = setTimeout(() => {
      setClosingTabs((current) => current.filter((entry) => !removedIds.includes(entry.tab.id)))
    }, effectiveDuration)

    return () => clearTimeout(timer)
  }, [tabs, effectiveDuration])

  if (closingTabs.length === 0) return tabs.map((tab) => ({ tab, closing: false }))

  const entries: AnimatedTabEntry<T>[] = tabs.map((tab) => ({ tab, closing: false }))
  // A tab that came back (reopened before the timer fired) is live, not a ghost.
  const ghosts = closingTabs.filter((entry) => !tabs.some((tab) => tab.id === entry.tab.id))
  for (const ghost of ghosts) {
    entries.splice(Math.min(ghost.index, entries.length), 0, { tab: ghost.tab, closing: true })
  }
  return entries
}
