export const normalizeTag = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed.toLowerCase()
}

export const normalizeTagList = (tags: string[]) => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const tag of tags) {
    const next = normalizeTag(tag)
    if (!next || seen.has(next)) continue
    seen.add(next)
    normalized.push(next)
  }

  return normalized
}

export const parseTagString = (value: string) => {
  if (!value.trim()) return []
  const rawTags = value.split(",")
  return normalizeTagList(rawTags)
}

export const buildTagString = (tags: string[]) => {
  return tags.join(", ")
}
