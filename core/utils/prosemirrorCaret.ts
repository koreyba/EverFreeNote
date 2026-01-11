import type { EditorView } from 'prosemirror-view'
import { Selection } from 'prosemirror-state'

export type PlaceCaretResult = {
  handled: boolean
  reason: 'posAtCoords' | 'fallback-start' | 'fallback-end' | 'noop'
}

/**
 * Places the caret near a click/tap on the editor background.
 *
 * Intended UX:
 * - Internal gaps between blocks: move caret to the nearest valid insertion point around that gap.
 * - True outside clicks (above/below editor bounds): fall back to start/end.
 *
 * Returns whether the event was handled (callers should `preventDefault()` when handled).
 */
export function placeCaretFromCoords(view: EditorView, clientX: number, clientY: number): PlaceCaretResult {
  try {
    const coords = view.posAtCoords({ left: clientX, top: clientY })
    if (coords) {
      const $pos = view.state.doc.resolve(coords.pos)
      const selection = Selection.near($pos, 1)
      const tr = view.state.tr.setSelection(selection).scrollIntoView()
      view.dispatch(tr)
      view.focus()
      return { handled: true, reason: 'posAtCoords' }
    }

    const rect = view.dom.getBoundingClientRect()
    if (clientY < rect.top) {
      const selection = Selection.atStart(view.state.doc)
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView())
      view.focus()
      return { handled: true, reason: 'fallback-start' }
    }

    if (clientY > rect.bottom) {
      const selection = Selection.atEnd(view.state.doc)
      view.dispatch(view.state.tr.setSelection(selection).scrollIntoView())
      view.focus()
      return { handled: true, reason: 'fallback-end' }
    }

    return { handled: false, reason: 'noop' }
  } catch {
    return { handled: false, reason: 'noop' }
  }
}
