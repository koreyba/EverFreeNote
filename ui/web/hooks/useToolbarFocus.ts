import * as React from 'react'
import { isAndroid, isiOS, isTextSelection, type Command, type Editor } from '@tiptap/core'

export type ToolbarFocusOrigin = {
  trigger: HTMLElement | null
  content: HTMLElement | null
}

/**
 * Restore editor focus after a toolbar command without letting its
 * deferred frame steal focus from the user's next interaction.
 */
export function useToolbarFocus(editor: Editor | null, enabled: boolean) {
  const generation = React.useRef(0)
  const lifetime = React.useRef<Editor | null>(null)
  const pending = React.useRef<{ win: Window; id: number } | null>(null)

  const cancelPendingFocus = React.useCallback(() => {
    generation.current += 1
    if (pending.current) {
      pending.current.win.cancelAnimationFrame(pending.current.id)
      pending.current = null
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!enabled || !editor) return
    const doc = editor.view.dom.ownerDocument
    const handleKeyDown = (event: KeyboardEvent) => {
      // Text input (including composition and Option/AltGraph characters)
      // on the closing menu's fallback focus is not a navigation intent.
      if (event.isComposing || event.key === 'Dead' || event.key === 'Process' || event.keyCode === 229) return
      const navigation = ['Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)
      const shortcut = (event.ctrlKey || event.metaKey) && !event.getModifierState('AltGraph')
      const target = event.target instanceof Element ? event.target : null
      const activation = (event.key === 'Enter' || event.key === ' ') &&
        Boolean(target?.closest('button, [role="button"], [role="combobox"], [role^="menuitem"]'))
      if (navigation || shortcut || activation) cancelPendingFocus()
    }
    lifetime.current = editor
    doc.addEventListener('pointerdown', cancelPendingFocus, true)
    doc.addEventListener('keydown', handleKeyDown, true)
    return () => {
      doc.removeEventListener('pointerdown', cancelPendingFocus, true)
      doc.removeEventListener('keydown', handleKeyDown, true)
      lifetime.current = null
      cancelPendingFocus()
    }
  }, [editor, enabled, cancelPendingFocus])

  const focusFromToolbar = React.useCallback((origin: ToolbarFocusOrigin): Command => ({ editor: current, view, tr, dispatch }) => {
    if (!dispatch) return true
    cancelPendingFocus()
    if (!enabled || view.hasFocus()) return true

    // Match Tiptap's leading, null-position focus command: its text-selection
    // branch explicitly preserves stored marks, while node selections do not.
    if (isTextSelection(current.state.selection) && current.state.selection.eq(tr.selection) && tr.storedMarks) {
      tr.setStoredMarks(tr.storedMarks)
    }

    const doc = view.dom.ownerDocument
    const win = doc.defaultView
    if (!win || lifetime.current !== current) return true
    const ticket = generation.current
    if (isiOS() || isAndroid()) (view.dom as HTMLElement).focus()

    const stillCurrent = () => generation.current === ticket && lifetime.current === current &&
      !current.isDestroyed && current.view === view && view.dom.isConnected

    if (!stillCurrent()) return true
    const id = win.requestAnimationFrame(() => {
      if (pending.current?.id === id && pending.current.win === win) pending.current = null
      if (!stillCurrent()) return
      const focused = doc.activeElement
      if (!focused) return
      if (focused !== doc.body && !view.dom.contains(focused) &&
        !origin.trigger?.contains(focused) && !origin.content?.contains(focused)) return
      view.focus()
      if (stillCurrent()) current.commands.scrollIntoView()
    })
    pending.current = { win, id }
    return true
  }, [cancelPendingFocus, enabled])

  return { cancelPendingFocus, focusFromToolbar }
}
