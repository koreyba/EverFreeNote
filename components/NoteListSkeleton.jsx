import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for note list
 * Displays placeholder cards while notes are being fetched
 */
export function NoteListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-3 rounded-lg border border-transparent"
        >
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <div className="flex gap-1 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

