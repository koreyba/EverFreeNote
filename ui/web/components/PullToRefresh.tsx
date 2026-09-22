"use client"

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { ArrowDown, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@ui/web/lib/utils'

const RELEASE_DISTANCE = 120
const REFRESH_TIMEOUT_MS = 10_000
const CONTROL_SELECTOR = 'button, a, input, textarea, select, [contenteditable="true"], [role="button"]'

function isAtTop(target: Element): boolean {
  // The list uses a nested virtual scroll container; the wrapper itself does
  // not necessarily own scrolling. Check the whole ancestor chain.
  for (let node: Element | null = target; node; node = node.parentElement) {
    if (node.scrollTop > 0) return false
  }
  return true
}

type PullToRefreshProps = {
  children: ReactNode
  onRefresh?: (signal: AbortSignal) => Promise<void>
  className?: string
  indicatorClassName?: string
}

export function PullToRefresh({ children, onRefresh, className, indicatorClassName }: PullToRefreshProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const refreshRef = useRef(onRefresh)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const enabled = Boolean(onRefresh) && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  useEffect(() => { refreshRef.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!enabled || !surface) return
    let start: { x: number; y: number; target: Element } | null = null
    let pulled = 0
    let disposed = false
    let request: AbortController | null = null
    let suppressClickUntil = 0

    const reset = () => { start = null; pulled = 0; setDistance(0) }
    const refresh = async () => {
      const controller = new AbortController()
      request = controller
      setRefreshing(true)
      const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Refresh cancelled')), { once: true })
      })
      try {
        await Promise.race([refreshRef.current?.(controller.signal), aborted])
      } catch {
        if (!disposed) toast.error('Could not refresh. Check your connection and try again.')
      } finally {
        clearTimeout(timeout)
        request = null
        if (!disposed) setRefreshing(false)
      }
    }
    const onStart = (event: TouchEvent) => {
      reset()
      const target = event.target
      if (request || event.touches.length !== 1 || !(target instanceof Element)) return
      if (target.closest(CONTROL_SELECTOR) || window.getSelection()?.toString() || !isAtTop(target)) return
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY, target }
    }
    const onMove = (event: TouchEvent) => {
      if (!start) return
      if (event.touches.length !== 1 || window.getSelection()?.toString() || !isAtTop(start.target)) { reset(); return }
      const touch = event.touches[0]
      const dy = touch.clientY - start.y
      const dx = Math.abs(touch.clientX - start.x)
      if (dy < 0 || dx > Math.max(8, dy)) { reset(); return }
      if (dy < 8) return
      event.preventDefault()
      pulled = dy
      setDistance(Math.min(dy, RELEASE_DISTANCE * 1.5))
    }
    const onEnd = (event: TouchEvent) => {
      const shouldRefresh = pulled >= RELEASE_DISTANCE
      if (pulled > 0) {
        event.preventDefault()
        suppressClickUntil = Date.now() + 500
      }
      reset()
      if (shouldRefresh && !request) void refresh()
    }
    const onClick = (event: MouseEvent) => {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation() }
    }
    surface.addEventListener('touchstart', onStart, { passive: true })
    surface.addEventListener('touchmove', onMove, { passive: false })
    surface.addEventListener('touchend', onEnd, { passive: false })
    surface.addEventListener('touchcancel', reset)
    surface.addEventListener('click', onClick, true)
    return () => {
      disposed = true
      request?.abort()
      surface.removeEventListener('touchstart', onStart)
      surface.removeEventListener('touchmove', onMove)
      surface.removeEventListener('touchend', onEnd)
      surface.removeEventListener('touchcancel', reset)
      surface.removeEventListener('click', onClick, true)
    }
  }, [enabled])

  return (
    <div ref={surfaceRef} className={cn('relative flex h-full min-h-0 flex-1 flex-col', className)} data-cy="pull-to-refresh">
      {enabled && (distance > 0 || refreshing) && (
        <div className={cn('pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center', indicatorClassName)}>
          <div role="status" className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs text-foreground shadow-md">
            {refreshing ? <ArrowClockwise className="size-4 animate-spin" /> : <ArrowDown className={cn('size-4', distance >= RELEASE_DISTANCE && 'rotate-180')} />}
            {refreshing ? 'Refreshing…' : distance >= RELEASE_DISTANCE ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
