import type { Editor } from '@tiptap/react'
import { TextSelection } from '@tiptap/pm/state'
import { CHUNK_FOCUS_KEY } from '@/extensions/ChunkFocus'

type BlockRange = {
  from: number
  to: number
}

type ChunkBlockRangesResult = {
  ranges: BlockRange[]
  firstFocusPos: number | null
}

const CHUNK_SCROLL_TOP_GUTTER_PX = 48

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null

  while (current) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }

  return null
}

function scrollChunkElementIntoView(element: HTMLElement | null) {
  if (!element) return

  const scrollParent = findScrollParent(element)
  if (!scrollParent) {
    element.scrollIntoView({ behavior: 'auto', block: 'start' })
    return
  }

  const align = () => {
    const parentRect = scrollParent.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const offsetTop = elementRect.top - parentRect.top + scrollParent.scrollTop
    const targetTop = Math.max(0, offsetTop - CHUNK_SCROLL_TOP_GUTTER_PX)

    scrollParent.scrollTo({
      top: targetTop,
      behavior: 'auto',
    })
  }

  align()
  window.requestAnimationFrame(align)
}

function getChunkBlockRanges(editor: Editor, charOffset: number, chunkLength: number): ChunkBlockRangesResult {
  const { doc } = editor.state
  const chunkStart = Math.max(0, charOffset)
  const chunkEnd = chunkStart + Math.max(1, chunkLength)
  let plainTextOffset = 0
  const rangeMap = new Map<string, BlockRange>()
  let firstFocusPos: number | null = null
  const containerTypes = new Set(['orderedList', 'bulletList', 'taskList'])

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true

    const blockText = node.textContent
    const blockLen = blockText.length
    const blockStart = plainTextOffset
    const blockEnd = blockStart + blockLen
    const visualBlockEnd = blockEnd + 1
    const blockHasOverlap = visualBlockEnd > chunkStart && blockStart < chunkEnd

    if (firstFocusPos === null && visualBlockEnd > chunkStart) {
      firstFocusPos = Math.min(pos + 1, doc.content.size)
    }

    if (blockHasOverlap) {
      const $pos = doc.resolve(Math.min(pos + 1, doc.content.size))
      let rangeFrom = pos
      let rangeTo = pos + node.nodeSize

      for (let depth = $pos.depth; depth > 0; depth -= 1) {
        const ancestor = $pos.node(depth)
        if (!containerTypes.has(ancestor.type.name)) continue
        rangeFrom = $pos.before(depth)
        rangeTo = $pos.after(depth)
        break
      }

      rangeMap.set(`${rangeFrom}:${rangeTo}`, { from: rangeFrom, to: rangeTo })
      if (firstFocusPos === null) {
        firstFocusPos = Math.min(pos + 1, doc.content.size)
      }
    }

    plainTextOffset = blockEnd + 1
    return false
  })

  return { ranges: Array.from(rangeMap.values()), firstFocusPos }
}

export function scrollEditorToChunk(editor: Editor, charOffset: number, chunkLength: number): boolean {
  const { ranges, firstFocusPos } = getChunkBlockRanges(editor, charOffset, chunkLength)
  if (ranges.length === 0) return false

  const focusPos = firstFocusPos ?? ranges[0].from
  const $pos = editor.state.doc.resolve(Math.min(focusPos, editor.state.doc.content.size))
  editor.view.dispatch(
    editor.state.tr
      .setMeta(CHUNK_FOCUS_KEY, { ranges })
      .setSelection(TextSelection.near($pos))
  )
  const el = editor.view.dom.querySelector('.chunk-focus-block-start, .chunk-focus-block')
  scrollChunkElementIntoView(el instanceof HTMLElement ? el : null)
  return true
}
