import { act, renderHook } from '@testing-library/react'

import { TAB_TRANSITION_MS, useAnimatedTabList } from '@ui/web/hooks/useAnimatedTabList'

type Tab = { id: string }

const installMatchMedia = (reducedMotion: boolean) => {
  const listeners = new Set<() => void>()
  const query = {
    matches: reducedMotion,
    addEventListener: (_event: string, listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_event: string, listener: () => void) => { listeners.delete(listener) },
    addListener: (listener: () => void) => { listeners.add(listener) },
    removeListener: (listener: () => void) => { listeners.delete(listener) },
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn(() => query),
  })
  return query
}

const ids = (entries: Array<{ tab: Tab; closing: boolean }>) =>
  entries.map((entry) => `${entry.tab.id}${entry.closing ? ':closing' : ''}`)

describe('useAnimatedTabList', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    installMatchMedia(false)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('passes the live tabs through untouched while nothing is removed', () => {
    const { result, rerender } = renderHook(({ tabs }) => useAnimatedTabList(tabs), {
      initialProps: { tabs: [{ id: 'a' }, { id: 'b' }] as Tab[] },
    })

    expect(ids(result.current)).toEqual(['a', 'b'])

    rerender({ tabs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] })

    expect(ids(result.current)).toEqual(['a', 'b', 'c'])
  })

  it('keeps a removed tab in its slot until the exit has played', () => {
    const { result, rerender } = renderHook(({ tabs }) => useAnimatedTabList(tabs), {
      initialProps: { tabs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Tab[] },
    })

    rerender({ tabs: [{ id: 'a' }, { id: 'c' }] })

    // Held in the middle slot so the strip closes the gap from where it was.
    expect(ids(result.current)).toEqual(['a', 'b:closing', 'c'])

    act(() => { jest.advanceTimersByTime(TAB_TRANSITION_MS) })

    expect(ids(result.current)).toEqual(['a', 'c'])
  })

  it('treats a tab that comes back as live rather than a leftover ghost', () => {
    const { result, rerender } = renderHook(({ tabs }) => useAnimatedTabList(tabs), {
      initialProps: { tabs: [{ id: 'a' }, { id: 'b' }] as Tab[] },
    })

    rerender({ tabs: [{ id: 'a' }] })
    expect(ids(result.current)).toEqual(['a', 'b:closing'])

    rerender({ tabs: [{ id: 'a' }, { id: 'b' }] })
    expect(ids(result.current)).toEqual(['a', 'b'])
  })

  it('removes the tab immediately when the viewer asked for reduced motion', () => {
    installMatchMedia(true)
    const { result, rerender } = renderHook(({ tabs }) => useAnimatedTabList(tabs), {
      initialProps: { tabs: [{ id: 'a' }, { id: 'b' }] as Tab[] },
    })

    rerender({ tabs: [{ id: 'a' }] })

    expect(ids(result.current)).toEqual(['a'])
  })
})
