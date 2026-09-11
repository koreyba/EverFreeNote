"use client"

/**
 * Capacitor POC perf harness — NOT part of the product.
 *
 * Renders the real production NoteList against synthetic notes so WebView list
 * performance can be measured on device without authentication or a backend.
 * Gated behind NEXT_PUBLIC_ENABLE_PERF_HARNESS so a normal build ships an empty page.
 *
 * Usage on device: https://localhost/perf-harness/?n=1000
 * Timings are printed to the console, which Capacitor forwards to logcat:
 *   adb logcat -s Capacitor/Console
 */

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"

import { NoteList } from "@/components/features/notes/NoteList"
import type { Note } from "@core/types/domain"

/**
 * Read per render rather than at module scope: Next.js inlines NEXT_PUBLIC_* wherever it
 * appears, so this is still a constant in a real build, and it keeps the module free of
 * load-order coupling.
 */
function harnessEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PERF_HARNESS === "true"
}

const TAG_POOL = ["work", "ideas", "personal", "reading", "todo", "archive", "draft", "meeting"]

/** Deterministic pseudo-random so runs are comparable across builds. */
function makeRng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}

function generateNotes(count: number): Note[] {
  const rng = makeRng(42)
  const now = Date.now()
  const notes: Note[] = []

  for (let i = 0; i < count; i += 1) {
    const tagCount = Math.floor(rng() * 4)
    const tags: string[] = []
    for (let t = 0; t < tagCount; t += 1) {
      const tag = TAG_POOL[Math.floor(rng() * TAG_POOL.length)]
      if (!tags.includes(tag)) tags.push(tag)
    }

    // Body length varies so row heights are not uniform — matches real usage and
    // stresses the dynamic-height path in react-window v2.
    const words = 12 + Math.floor(rng() * 60)
    const description = Array.from({ length: words }, (_, w) => `word${(i + w) % 97}`).join(" ")
    const created = new Date(now - i * 3_600_000).toISOString()

    notes.push({
      id: `perf-${i}`,
      title: `Perf note ${i} — ${description.slice(0, 24)}`,
      description,
      tags,
      created_at: created,
      updated_at: created,
      user_id: "perf-harness",
    })
  }

  return notes
}

const subscribeNoop = () => () => {}

export default function PerfHarnessPage() {
  // The note count comes from the URL, which only exists on the client. Reading it
  // through useSyncExternalStore keeps the static prerender ("preparing harness…")
  // and the hydrated render in agreement.
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  )
  const reportedRef = useRef(false)

  const count = useMemo(() => {
    if (!isClient) return 0
    const params = new URLSearchParams(globalThis.location.search)
    const parsed = Number.parseInt(params.get("n") ?? "1000", 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000
  }, [isClient])

  const notes = useMemo(() => (count > 0 ? generateNotes(count) : []), [count])

  // Time from navigation start to the frame that actually paints the first rows.
  useEffect(() => {
    if (notes.length === 0 || reportedRef.current) return
    reportedRef.current = true

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const paint = performance.now()
        // Navigation Timing is not universally present (jsdom, older WebViews); the
        // paint number is the one that matters, so missing timings must not break it.
        const nav =
          typeof performance.getEntriesByType === "function"
            ? (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)
            : undefined
        // Also exposed on window so the measure script can read it over CDP,
        // which is more reliable than scraping logcat on release builds.
        const globalWithPerf = globalThis as unknown as { __perf?: Record<string, unknown> }
        globalWithPerf.__perf = {
          notes: notes.length,
          listPaintedMs: Number(paint.toFixed(1)),
          domContentLoadedMs: nav ? Number(nav.domContentLoadedEventEnd.toFixed(1)) : null,
          loadMs: nav ? Number(nav.loadEventEnd.toFixed(1)) : null,
          frames: [] as Array<Record<string, number>>,
        }
        console.log(
          `[PERF] notes=${notes.length} ` +
            `list_painted_ms=${paint.toFixed(1)} ` +
            `dom_content_loaded_ms=${nav ? nav.domContentLoadedEventEnd.toFixed(1) : "n/a"} ` +
            `load_ms=${nav ? nav.loadEventEnd.toFixed(1) : "n/a"}`
        )
      })
    })
  }, [notes])

  // Rolling FPS/long-frame counter, reported every 2s while scrolling.
  useEffect(() => {
    if (!harnessEnabled()) return
    let frames = 0
    let longFrames = 0
    let last = performance.now()
    let windowStart = last
    let raf = 0

    const tick = () => {
      const now = performance.now()
      const delta = now - last
      last = now
      frames += 1
      if (delta > 32) longFrames += 1 // missed at least one 60Hz frame

      if (now - windowStart >= 2000) {
        const fps = (frames * 1000) / (now - windowStart)
        const globalWithPerf = globalThis as unknown as { __perf?: { frames?: Array<Record<string, number>> } }
        globalWithPerf.__perf?.frames?.push({
          fps: Number(fps.toFixed(1)),
          longFrames,
          totalFrames: frames,
        })
        console.log(
          `[PERF] fps=${fps.toFixed(1)} long_frames=${longFrames}/${frames} ` +
            `(${((longFrames / frames) * 100).toFixed(1)}%)`
        )
        frames = 0
        longFrames = 0
        windowStart = now
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!harnessEnabled()) return null

  // NoteList mounts AutoSizer, which needs ResizeObserver — render it only once the
  // client effect has supplied a count, so the static export can still prerender.
  if (notes.length === 0) return <div className="p-4 text-sm">preparing harness…</div>

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="border-b px-4 py-2 text-sm text-muted-foreground">
        perf harness · {notes.length} notes
      </div>
      <div className="min-h-0 flex-1">
        <NoteList
          notes={notes}
          isLoading={false}
          onSelectNote={() => {}}
          onTagClick={() => {}}
          onLoadMore={() => {}}
          hasMore={false}
          isFetchingNextPage={false}
        />
      </div>
    </div>
  )
}
