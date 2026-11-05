import { diffArrays, diffLines } from 'diff'
import { NoteClipboardService } from '@core/services/noteClipboard'

type NoteVersionSnapshot = {
  title: string | null
  description: string | null
  tags: readonly string[] | null
}

type NoteTextDiffPart = {
  kind: 'unchanged' | 'added' | 'removed'
  text: string
  block?: true
}

export type NoteTextDiff = {
  parts: NoteTextDiffPart[]
  limited: boolean
}

type NoteVersionComparison = {
  title: NoteTextDiff | null
  body: NoteTextDiff | null
  bodyMarkupChanged: boolean
  addedTags: string[]
  removedTags: string[]
  tagOrderChanged: boolean
}

const MAX_COMPARED_MARKUP_LENGTH = 1_000_000
const MAX_COMPARED_TEXT_LENGTH = 40_000
const DIFF_OPTIONS = { maxEditLength: 512, timeout: 50 }
const wordSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'word' })
  : null

function tokenizeText(text: string): string[] {
  if (wordSegmenter) {
    return Array.from(wordSegmenter.segment(text), ({ segment }) => segment)
  }
  // Keep Unicode properties separate for Next.js's bundled Babel transform.
  return text.match(/(?:\p{L}|\p{M}|\p{N}|_)+|[^\S\r\n]+|[\s\S]/gu) ?? []
}

function compareText(current: string, selected: string): NoteTextDiff | null {
  if (current === selected) return null
  if (current.length + selected.length > MAX_COMPARED_TEXT_LENGTH) return { parts: [], limited: true }

  const changes = diffArrays(tokenizeText(current), tokenizeText(selected), DIFF_OPTIONS)
  if (!changes) return { parts: [], limited: true }

  return {
    parts: changes.map((change) => ({
      kind: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      text: change.value.join(''),
    })),
    limited: false,
  }
}

function compareBody(current: string, selected: string): NoteTextDiff | null {
  if (current === selected) return null
  // Imported notes can contain large embedded images. Bound parsing as well as diffing.
  if (current.length + selected.length > MAX_COMPARED_MARKUP_LENGTH) return { parts: [], limited: true }

  const currentText = NoteClipboardService.htmlToPlainText(current)
  const selectedText = NoteClipboardService.htmlToPlainText(selected)
  if (currentText === selectedText) return null
  if (currentText.length + selectedText.length > MAX_COMPARED_TEXT_LENGTH) return { parts: [], limited: true }
  if (!currentText.includes('\n') && !selectedText.includes('\n')) {
    return compareText(currentText, selectedText)
  }

  const lineChanges = diffLines(currentText, selectedText, { ...DIFF_OPTIONS, ignoreNewlineAtEof: true })
  if (!lineChanges) return { parts: [], limited: true }

  // A single replaced line keeps word highlights. Larger edits use whole lines.
  const edits = lineChanges.filter((change) => change.added || change.removed)
  const [first, second] = edits
  if (edits.length === 2 && first.count === 1 && second.count === 1
    && lineChanges.indexOf(second) === lineChanges.indexOf(first) + 1) {
    return compareText(currentText, selectedText)
  }

  return {
    parts: lineChanges.map((change) => ({
      kind: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      text: change.value,
      block: true,
    })),
    limited: false,
  }
}

/** Compare visible changes from the first snapshot to the second. */
export function compareNoteVersions(
  current: NoteVersionSnapshot,
  selected: NoteVersionSnapshot,
): NoteVersionComparison {
  const currentHtml = current.description ?? ''
  const selectedHtml = selected.description ?? ''
  const body = compareBody(currentHtml, selectedHtml)
  const currentTags = new Set(current.tags)
  const selectedTags = new Set(selected.tags)
  const currentTagsInOrder = [...currentTags]
  const selectedTagsInOrder = [...selectedTags]
  const addedTags = selectedTagsInOrder.filter((tag) => !currentTags.has(tag))
  const removedTags = currentTagsInOrder.filter((tag) => !selectedTags.has(tag))

  return {
    title: compareText(current.title ?? '', selected.title ?? ''),
    body,
    bodyMarkupChanged: body === null && currentHtml !== selectedHtml,
    addedTags,
    removedTags,
    tagOrderChanged: addedTags.length === 0 && removedTags.length === 0
      && currentTagsInOrder.some((tag, index) => tag !== selectedTagsInOrder[index]),
  }
}
