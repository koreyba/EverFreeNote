import { parseDocument } from 'htmlparser2'
import { z } from 'zod'
import { sanitizeNoteHtml } from './noteHtml.ts'

const fragment = z.string().max(200_000)
export const contentEditSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.enum(['append', 'prepend']), content_html: fragment.min(1) }).strict(),
  z.object({ operation: z.enum(['insert_before', 'insert_after', 'replace']), anchor_html: z.string().min(1).max(200_000), content_html: fragment }).strict(),
])
export type ContentEdit = z.infer<typeof contentEditSchema>

/** An anchor must span complete top-level nodes, never part of an attribute or nested tag. */
function anchorRange(html: string, anchor: string): [number, number] {
  const start = html.indexOf(anchor)
  if (start < 0) throw new Error('anchor_html was not found. Read the note again and use exact HTML blocks.')
  if (html.indexOf(anchor, start + 1) >= 0) throw new Error('anchor_html is ambiguous. Include more surrounding HTML blocks.')
  const end = start + anchor.length
  const nodes = parseDocument(html, { withStartIndices: true, withEndIndices: true }).children
  let previousEnd = -1
  for (const node of nodes) {
    // Implied end tags can give htmlparser2 overlapping root ranges. Those
    // ranges cannot prove that an anchor spans complete source blocks.
    if (node.startIndex === null || node.endIndex === null || node.startIndex <= previousEnd) {
      throw new Error('Stored HTML has overlapping or incomplete block boundaries. Open and save the note in the editor before anchored edits.')
    }
    previousEnd = node.endIndex
  }
  if (!nodes.some(node => node.startIndex === start) || !nodes.some(node => node.endIndex !== null && node.endIndex + 1 === end)) {
    throw new Error('anchor_html must contain complete top-level HTML blocks, such as an entire paragraph or list.')
  }
  return [start, end]
}

/** Apply edits in order, preserving every untouched source byte. Only new fragments are sanitized. */
export function applyContentEdits(html: string, edits: readonly ContentEdit[]): string {
  if (edits.reduce((size, edit) => size + edit.content_html.length, 0) > 1_000_000) throw new Error('Combined edit content exceeds 1000000 characters')
  let result = html
  for (const edit of edits) {
    const content = sanitizeNoteHtml(edit.content_html)
    if (!content && edit.operation !== 'replace') throw new Error('content_html contains no supported content')
    if (edit.operation === 'append') result += content
    else if (edit.operation === 'prepend') result = content + result
    else if ('anchor_html' in edit) {
      const [start, end] = anchorRange(result, edit.anchor_html)
      const from = edit.operation === 'insert_after' ? end : start
      const to = edit.operation === 'replace' ? end : from
      result = result.slice(0, from) + content + result.slice(to)
    }
  }
  return result
}
