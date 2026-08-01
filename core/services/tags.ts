import type { TagWithCount, AlphabeticalTagGroup } from '@core/types/tags'

interface NoteWithTags {
  tags?: string[]
}

type TagCountEntry = { canonical: string; count: number }

function tagsAreEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((tag, index) => tag === right[index])
}

function addNoteTagsToCounts(tags: string[], countsMap: Map<string, TagCountEntry>) {
  const uniqueInNote = new Set<string>()

  for (const rawTag of tags) {
    if (!rawTag || typeof rawTag !== 'string') continue
    const trimmed = rawTag.trim()
    if (!trimmed) continue

    const lower = trimmed.toLowerCase()
    if (uniqueInNote.has(lower)) continue
    uniqueInNote.add(lower)

    const existing = countsMap.get(lower)
    if (existing) {
      existing.count += 1
    } else {
      countsMap.set(lower, { canonical: trimmed, count: 1 })
    }
  }
}

/**
 * Extracts unique tags from notes with usage counts, sorted alphabetically.
 */
export function getTagsWithCounts<T extends NoteWithTags>(
  notes: T[],
  locale = 'ru'
): TagWithCount[] {
  const countsMap = new Map<string, TagCountEntry>()

  for (const note of notes) {
    if (!note.tags || !Array.isArray(note.tags)) continue
    addNoteTagsToCounts(note.tags, countsMap)
  }

  const result: TagWithCount[] = Array.from(countsMap.values()).map(item => ({
    name: item.canonical,
    count: item.count,
  }))

  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  result.sort((a, b) => collator.compare(a.name, b.name))

  return result
}

/**
 * Groups tags alphabetically by initial character (Latin, Cyrillic, or #).
 */
export function groupTagsAlphabetically(
  tags: TagWithCount[],
  locale = 'ru'
): AlphabeticalTagGroup[] {
  const groupsMap = new Map<string, TagWithCount[]>()

  for (const tag of tags) {
    if (!tag.name) continue
    const firstChar = tag.name.trim().charAt(0).toUpperCase()
    // Test if character is English or Russian letter
    const isAlpha = /^\p{L}$/u.test(firstChar)
    const letter = isAlpha ? firstChar : '#'

    const list = groupsMap.get(letter)
    if (list) {
      list.push(tag)
    } else {
      groupsMap.set(letter, [tag])
    }
  }

  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const keys = Array.from(groupsMap.keys()).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return collator.compare(a, b)
  })

  return keys.map(letter => ({
    letter,
    tags: groupsMap.get(letter) ?? [],
  }))
}

/**
 * Renames a tag across an array of notes.
 */
export function renameTagInNotes<T extends NoteWithTags>(
  notes: T[],
  oldTag: string,
  newTag: string
): T[] {
  const targetLower = oldTag.trim().toLowerCase()
  const replacementClean = newTag.trim()

  if (!targetLower || !replacementClean) return notes

  return notes.map(note => {
    if (!note.tags || !Array.isArray(note.tags)) return note
    
    const newTags: string[] = []
    const seen = new Set<string>()

    for (const tag of note.tags) {
      const lower = tag.trim().toLowerCase()
      if (lower === targetLower) {
        const repLower = replacementClean.toLowerCase()
        if (!seen.has(repLower)) {
          seen.add(repLower)
          newTags.push(replacementClean)
        }
      } else if (!seen.has(lower)) {
        seen.add(lower)
        newTags.push(tag)
      }
    }

    if (tagsAreEqual(note.tags, newTags)) return note
    return { ...note, tags: newTags }
  })
}

/**
 * Deletes a tag across an array of notes.
 */
export function deleteTagFromNotes<T extends NoteWithTags>(
  notes: T[],
  targetTag: string
): T[] {
  const targetLower = targetTag.trim().toLowerCase()
  if (!targetLower) return notes

  return notes.map(note => {
    if (!note.tags || !Array.isArray(note.tags)) return note

    const newTags = note.tags.filter(tag => {
      const lower = tag.trim().toLowerCase()
      return lower !== targetLower
    })

    if (tagsAreEqual(note.tags, newTags)) return note
    return { ...note, tags: newTags }
  })
}

/**
 * Cleans up invalid, empty, or whitespace-only tags from notes.
 */
export function cleanUnusedOrEmptyTagsInNotes<T extends NoteWithTags>(
  notes: T[]
): T[] {
  return notes.map(note => {
    if (!note.tags || !Array.isArray(note.tags)) return note

    const seen = new Set<string>()
    const cleanedTags: string[] = []

    for (const tag of note.tags) {
      if (!tag || typeof tag !== 'string') {
        continue
      }
      const trimmed = tag.trim()
      if (!trimmed) {
        continue
      }
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        cleanedTags.push(trimmed)
      }
    }

    if (tagsAreEqual(note.tags, cleanedTags)) return note
    return { ...note, tags: cleanedTags }
  })
}
