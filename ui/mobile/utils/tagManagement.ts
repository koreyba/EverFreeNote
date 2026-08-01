import { getTagsWithCounts, groupTagsAlphabetically } from '@core/services/tags'
import type { Note } from '@core/types/domain'
import type { TagWithCount } from '@core/types/tags'

export type MobileTagSummary = TagWithCount & {
  letter: string
}
export type MobileTagGroup = {
  letter: string
  tags: MobileTagSummary[]
}

export function getMobileTagSummaries(notes: Note[]): MobileTagSummary[] {
  return groupTagsAlphabetically(getTagsWithCounts(notes)).flatMap((group) => (
    group.tags.map((tag) => ({
      ...tag,
      letter: group.letter,
    }))
  ))
}

export function filterMobileTagSummaries(
  tags: MobileTagSummary[],
  search: string,
  selectedLetter: string | null
): MobileTagSummary[] {
  const normalizedSearch = search.trim().toLocaleLowerCase()

  return tags.filter((tag) => {
    const matchesSearch = normalizedSearch.length === 0
      || tag.name.toLocaleLowerCase().includes(normalizedSearch)
    const matchesLetter = selectedLetter === null || tag.letter === selectedLetter
    return matchesSearch && matchesLetter
  })
}

export function groupMobileTagSummaries(tags: MobileTagSummary[]): MobileTagGroup[] {
  const groups = new Map<string, MobileTagSummary[]>()

  for (const tag of tags) {
    const group = groups.get(tag.letter)
    if (group) {
      group.push(tag)
    } else {
      groups.set(tag.letter, [tag])
    }
  }

  return Array.from(groups, ([letter, groupedTags]) => ({
    letter,
    tags: groupedTags,
  }))
}

export function getMobileTagLetters(tags: MobileTagSummary[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.letter)))
}
