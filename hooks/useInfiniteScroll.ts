import { useEffect, useRef } from 'react'

/**
 * Custom hook for automatic infinite scroll
 * Uses Intersection Observer for optimal performance
 */
export function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const { threshold = 0.8, rootMargin = '200px' } = options
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Don't observe if no more pages or already fetching
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        // When the sentinel element becomes visible, fetch next page
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      {
        root: null, // viewport
        rootMargin, // Start loading before reaching the element
        threshold, // Trigger when 80% visible
      }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, threshold, rootMargin])

  return observerTarget
}

