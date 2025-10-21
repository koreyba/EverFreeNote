import { useEffect, useRef } from 'react'

/**
 * Custom hook for automatic infinite scroll
 * Uses Intersection Observer for optimal performance
 * 
 * @param {Function} fetchNextPage - Function to call when scrolling near bottom
 * @param {boolean} hasNextPage - Whether there are more pages to load
 * @param {boolean} isFetchingNextPage - Whether currently fetching
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - How close to bottom before triggering (0-1)
 * @param {string} options.rootMargin - Margin around root element
 */
export function useInfiniteScroll(
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  { threshold = 0.8, rootMargin = '200px' } = {}
) {
  const observerTarget = useRef(null)

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

