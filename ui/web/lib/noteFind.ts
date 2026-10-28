export type NoteFindMatch =
  | { kind: "text"; range: Range }
  | { kind: "title"; input: HTMLInputElement; start: number; end: number }

type TextPart = { node: Text; start: number; end: number }

function matchOffsets(text: string, query: string): Array<{ start: number; end: number }> {
  if (!query) return []
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(escaped, "giu")
  return Array.from(text.matchAll(pattern), (match) => ({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }))
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
  const titleMatches: NoteFindMatch[] = title instanceof HTMLInputElement
    ? matchOffsets(title.value, query).map(({ start, end }) => ({ kind: "title", input: title, start, end }))
    : title ? findTextRanges(title, query) : []
  return [...titleMatches, ...(body ? findTextRanges(body, query) : [])]
}
