// Pure tag helpers shared by the MCP tools.
//
// Tags are compared case-insensitively, matching how the web app groups them
// (see getTagsWithCounts in core/services/tags.ts), but the spelling already
// stored on a note is preserved rather than normalised.

export type TagCount = {
  name: string
  count: number
}

/** Trims, drops blanks, and removes case-insensitive duplicates keeping the first spelling. */
export function dedupeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawTag of tags ?? []) {
    const tag = rawTag.trim()
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(tag)
  }

  return result
}

/**
 * Counts how many notes carry each tag. A tag repeated within one note counts
 * once. The reported spelling is the first one encountered.
 */
export function aggregateTags(noteTagLists: readonly (readonly string[])[]): TagCount[] {
  const counts = new Map<string, TagCount>()

  for (const noteTags of noteTagLists) {
    for (const tag of dedupeTags(noteTags)) {
      const key = tag.toLowerCase()
      const existing = counts.get(key)
      if (existing) existing.count += 1
      else counts.set(key, { name: tag, count: 1 })
    }
  }

  return [...counts.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
}

/** Case-insensitive substring filter over aggregated tags. */
export function filterTags(tags: readonly TagCount[], query: string | null): TagCount[] {
  if (!query) return [...tags]

  const needle = query.trim().toLowerCase()
  if (!needle) return [...tags]

  return tags.filter((tag) => tag.name.toLowerCase().includes(needle))
}

export type TagEdit = {
  add: readonly string[]
  remove: readonly string[]
}

/**
 * Applies an incremental tag edit. Removal and duplicate detection are
 * case-insensitive; tags that survive keep their stored spelling, and genuinely
 * new tags keep the caller's. Removing an absent tag or adding a present one is
 * a no-op, so a retried call is harmless.
 */
export function applyTagEdit(currentTags: readonly string[], edit: TagEdit): string[] {
  const removeKeys = new Set(dedupeTags(edit.remove).map((tag) => tag.toLowerCase()))
  const result = dedupeTags(currentTags).filter((tag) => !removeKeys.has(tag.toLowerCase()))
  const presentKeys = new Set(result.map((tag) => tag.toLowerCase()))

  for (const tag of dedupeTags(edit.add)) {
    const key = tag.toLowerCase()
    if (presentKeys.has(key)) continue
    presentKeys.add(key)
    result.push(tag)
  }

  return result
}

/** True when the edit would leave the note's tags exactly as they are. */
export function tagsUnchanged(currentTags: readonly string[], nextTags: readonly string[]): boolean {
  return currentTags.length === nextTags.length && currentTags.every((tag, index) => tag === nextTags[index])
}
