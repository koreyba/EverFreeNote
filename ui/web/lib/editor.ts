import type { Editor } from '@tiptap/react'
import { SmartPasteService } from '@core/services/smartPaste'

export function applySelectionAsMarkdown(editor: Editor, onContentChange?: () => void): void {
  const { from, to } = editor.state.selection
  if (from === to) return
  const selectedText = editor.state.doc.textBetween(from, to, '\n')
  const payload = { text: selectedText, html: null, types: ['text/plain'] as string[] }
  const result = SmartPasteService.resolvePaste(payload, undefined, 'markdown')
  if (!result.html) return
  editor.chain().focus().deleteRange({ from, to }).insertContent(result.html).run()
  onContentChange?.()
}
