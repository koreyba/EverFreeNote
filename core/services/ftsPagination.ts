export function computeFtsHasMore(
  totalKnown: number | undefined,
  accumulatedLength: number,
  lastPageSize: number,
  limit: number
): boolean {
  if (typeof totalKnown === "number") {
    return accumulatedLength < totalKnown
  }
  return lastPageSize === limit
}

export function computeFtsTotal(
  totalKnown: number | undefined,
  accumulatedLength: number,
  hasMore: boolean
): number | undefined {
  if (typeof totalKnown === "number") return totalKnown
  return hasMore ? undefined : accumulatedLength
}
