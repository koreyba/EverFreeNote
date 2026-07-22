import { act, renderHook } from '@testing-library/react'
import { useInfiniteScroll } from '@ui/web/hooks/useInfiniteScroll'

type ObserverInstance = {
  observe: jest.Mock
  unobserve: jest.Mock
  trigger: (isIntersecting: boolean) => void
}

describe('useInfiniteScroll', () => {
  const originalIntersectionObserver = globalThis.IntersectionObserver
  let observers: ObserverInstance[]

  beforeEach(() => {
    observers = []
    globalThis.IntersectionObserver = jest.fn().mockImplementation((callback: IntersectionObserverCallback) => {
      const instance: ObserverInstance = {
        observe: jest.fn(),
        unobserve: jest.fn(),
        trigger: (isIntersecting) => callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
      }
      observers.push(instance)
      return instance
    }) as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver
  })

  it('observes the sentinel and fetches only when it intersects', () => {
    const fetchNextPage = jest.fn()
    const sentinel = document.createElement('div')
    const { result } = renderHook(() => {
      const target = useInfiniteScroll(fetchNextPage, true, false, { threshold: 0.5, rootMargin: '40px' })
      target.current = sentinel
      return target
    })

    expect(observers).toHaveLength(1)
    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      root: null,
      rootMargin: '40px',
      threshold: 0.5,
    })
    expect(observers[0].observe).toHaveBeenCalledWith(sentinel)

    act(() => observers[0].trigger(false))
    expect(fetchNextPage).not.toHaveBeenCalled()
    act(() => observers[0].trigger(true))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
    expect(result.current.current).toBe(sentinel)
  })

  it('does not create an observer when there is no next page or a fetch is active', () => {
    const fetchNextPage = jest.fn()
    const { rerender } = renderHook(
      ({ hasNextPage, isFetching }: { hasNextPage: boolean; isFetching: boolean }) =>
        useInfiniteScroll(fetchNextPage, hasNextPage, isFetching),
      { initialProps: { hasNextPage: false, isFetching: false } },
    )

    expect(globalThis.IntersectionObserver).not.toHaveBeenCalled()
    rerender({ hasNextPage: true, isFetching: true })
    expect(globalThis.IntersectionObserver).not.toHaveBeenCalled()
  })

  it('unobserves the current sentinel during cleanup and when dependencies change', () => {
    const fetchNextPage = jest.fn()
    const firstSentinel = document.createElement('div')
    const secondSentinel = document.createElement('div')
    const { rerender, unmount } = renderHook(
      ({ fetch }: { fetch: () => void }) => {
        const target = useInfiniteScroll(fetch, true, false)
        target.current = target.current === firstSentinel ? secondSentinel : firstSentinel
        return target
      },
      { initialProps: { fetch: fetchNextPage } },
    )

    expect(observers[0].observe).toHaveBeenCalledWith(firstSentinel)
    const replacementFetch = jest.fn()
    rerender({ fetch: replacementFetch })
    expect(observers[0].unobserve).toHaveBeenCalledWith(firstSentinel)
    expect(observers[1].observe).toHaveBeenCalledWith(secondSentinel)
    unmount()
    expect(observers[1].unobserve).toHaveBeenCalledWith(secondSentinel)
  })
})
