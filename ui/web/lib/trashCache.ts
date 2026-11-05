export const trashCacheKey = (owner: string) => `everfreenote:trash:${owner}`

/** Only the disposable reading cache: pending deletions remain in the durable queue. */
export function clearTrashCache(owner: string) {
  try {
    localStorage.removeItem(trashCacheKey(owner))
  } catch {
    /* Storage may be unavailable. */
  }
}
