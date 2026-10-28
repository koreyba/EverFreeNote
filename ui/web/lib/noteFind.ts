export type NoteFindMatch =
  | { kind: "text"; range: Range }
  | { kind: "title"; input: HTMLInputElement | HTMLTextAreaElement; start: number; end: number }

type TextPart = { node: Text; start: number; end: number }

function foldCase(character: string): string {
  // Unicode simple case folding keeps dotless i separate and does not expand
  // a single character into several characters (for example, ß or İ).
  if (character === "ı") return character
  const upper = character.toUpperCase()
  const folded = Array.from(upper).length === 1 ? upper.toLowerCase() : character.toLowerCase()
  return Array.from(folded).length === 1 ? folded : character
}

function matchOffsets(text: string, query: string): Array<{ start: number; end: number }> {
  if (!query) return []
  let foldedText = ""
  let originalOffset = 0
  const boundaries: Array<number | undefined> = [0]
  for (const character of text) {
    foldedText += foldCase(character)
    originalOffset += character.length
    boundaries[foldedText.length] = originalOffset
  }
  const foldedQuery = Array.from(query, foldCase).join("")
  const matches: Array<{ start: number; end: number }> = []
  let next = 0
  while (next <= foldedText.length - foldedQuery.length) {
    const start = foldedText.indexOf(foldedQuery, next)
    if (start < 0) break
    const end = start + foldedQuery.length
    const originalStart = boundaries[start]
    const originalEnd = boundaries[end]
    if (originalStart !== undefined && originalEnd !== undefined) {
      matches.push({ start: originalStart, end: originalEnd })
      next = end
    } else {
      next = start + 1
    }
  }
  return matches
}

function findTextRanges(root: HTMLElement, query: string): NoteFindMatch[] {
  const groups: Array<{ block: Element; text: string; parts: TextPart[] }> = []
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node as Text
    const parent = text.parentElement
    if (!parent || !text.data || parent.closest("script, style, [aria-hidden='true'], [contenteditable='false']")) continue
    const candidate = parent.closest("p, li, h1, h2, h3, h4, h5, h6, pre, td, th, blockquote")
    const block = candidate && root.contains(candidate) ? candidate : root
    let group = groups.at(-1)
    if (!group || group.block !== block) {
      group = { block, text: "", parts: [] }
      groups.push(group)
    }
    const start = group.text.length
    group.text += text.data
    group.parts.push({ node: text, start, end: group.text.length })
  }

  return groups.flatMap((group) => matchOffsets(group.text, query).flatMap(({ start, end }) => {
    const first = group.parts.find((part) => start >= part.start && start < part.end)
    const last = group.parts.find((part) => end > part.start && end <= part.end)
    if (!first || !last) return []
    const range = root.ownerDocument.createRange()
    range.setStart(first.node, start - first.start)
    range.setEnd(last.node, end - last.start)
    return [{ kind: "text" as const, range }]
  }))
}

export function findInNote(title: HTMLElement | null, body: HTMLElement | null, query: string): NoteFindMatch[] {
  if (!query) return []
  const titleMatches: NoteFindMatch[] = (title instanceof HTMLInputElement || title instanceof HTMLTextAreaElement)
    ? matchOffsets(title.value, query).map(({ start, end }) => ({ kind: "title", input: title, start, end }))
    : title ? findTextRanges(title, query) : []
  return [...titleMatches, ...(body ? findTextRanges(body, query) : [])]
}
