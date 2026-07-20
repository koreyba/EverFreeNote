"use client"

import * as React from "react"
import {
  useEditor,
  EditorContent,
  type Editor,
} from "@tiptap/react"
import { createDocument } from "@tiptap/core"
import type { EditorView } from "@tiptap/pm/view"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SPELLCHECK_ENABLED_KEY } from "@core/constants/preferences"
import { SmartPasteService } from "@core/services/smartPaste"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { placeCaretFromCoords } from "@core/utils/prosemirrorCaret"
import { applySelectionAsMarkdown } from "@ui/web/lib/editor"
import { EditorMenuBar, type HistoryState } from "./EditorMenuBar"
import { editorExtensions } from "./editorExtensions"
import { executeEditorCommand } from "./executeEditorCommand"
import { scrollEditorToChunk } from "./chunkFocusUtils"

export type RichTextEditorHandle = {
  getHTML: () => string
  setContent: (html: string) => void
  runCommand: (command: string, ...args: unknown[]) => void
  /** Scroll to and highlight the given plain-text chunk range.
   *  charOffset must be relative to the note body (not including title prefix). */
  scrollToChunk: (charOffset: number, chunkLength: number) => void
}

type RichTextEditorProps = {
  initialContent: string
  onContentChange?: () => void // Called when content changes (for triggering autosave)
  hideToolbar?: boolean
  chunkFocusRequest?: ChunkScrollTarget | null
  onChunkFocusApplied?: (requestId: string) => void
}

const EMPTY_HISTORY_STATE: HistoryState = { canUndo: false, canRedo: false }

const areHistoryStatesEqual = (left: HistoryState, right: HistoryState) =>
  left.canUndo === right.canUndo && left.canRedo === right.canRedo

const getHistoryState = (editor: Editor): HistoryState => ({
  canUndo: editor.can().undo(),
  canRedo: editor.can().redo(),
})

export type ChunkScrollTarget = {
  requestId: string
  charOffset: number
  chunkLength: number
}

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ initialContent, onContentChange, hideToolbar = false, chunkFocusRequest = null, onChunkFocusApplied }, ref) => {
    const editorRef = React.useRef<Editor | null>(null)
    const suppressNextUpdateRef = React.useRef(false)
    // Queues a scroll request when scrollToChunk is called before the editor is ready.
    const pendingChunkScrollRef = React.useRef<ChunkScrollTarget | null>(null)
    const pendingChunkFocusRef = React.useRef<ChunkScrollTarget | null>(null)
    const lastAppliedChunkFocusRequestIdRef = React.useRef<string | null>(null)
    const [hasSelection, setHasSelection] = React.useState(false)
    const [historyState, setHistoryState] = React.useState<HistoryState>(EMPTY_HISTORY_STATE)
    const [spellcheckEnabled, setSpellcheckEnabled] = React.useState(true)

    React.useEffect(() => {
      try {
        const stored = localStorage.getItem(SPELLCHECK_ENABLED_KEY)
        if (stored !== null) {
          setSpellcheckEnabled(stored !== "false")
        }
      } catch {
        // Fallback to true if storage is blocked/disabled
        setSpellcheckEnabled(true)
      }
    }, [])

    const updateHistoryState = React.useCallback((next: HistoryState) => {
      setHistoryState((prev) => (areHistoryStatesEqual(prev, next) ? prev : next))
    }, [])

    const handleApplySelectionAsMarkdown = React.useCallback(() => {
      const editor = editorRef.current
      if (!editor) return
      applySelectionAsMarkdown(editor, onContentChange)
    }, [onContentChange])

    const handleUndo = React.useCallback(() => {
      editorRef.current?.commands.undo()
    }, [])

    const handleRedo = React.useCallback(() => {
      editorRef.current?.commands.redo()
    }, [])

    const handlePaste = React.useCallback((_: unknown, event: ClipboardEvent) => {
      if (!event.clipboardData) return false
      const editor = editorRef.current
      if (!editor) return false

      // If the clipboard comes from ProseMirror itself (intra-editor copy/paste),
      // let ProseMirror handle it natively. It uses the data-pm-slice attribute
      // to merge content correctly without creating extra empty paragraphs.
      const rawHtml = event.clipboardData.getData('text/html')
      if (rawHtml && rawHtml.includes('data-pm-slice')) {
        return false
      }

      const payload = SmartPasteService.buildPayload(event)
      if (!payload.html && !payload.text) return false

      const result = SmartPasteService.resolvePaste(payload)
      event.preventDefault()
      suppressNextUpdateRef.current = true
      editor.chain().focus().insertContent(result.html).run()

      // Explicitly trigger onContentChange after paste.
      // Some environments may not reliably fire onUpdate after insertContent.
      onContentChange?.()
      return true
    }, [onContentChange])

    // Apply the EverFreeNote clipboard contract to native Ctrl+C / Cmd+C of a
    // selection: emit dual text/html (self-copy-marked) + clean text/plain so a
    // copied selection round-trips losslessly back into EverFreeNote and degrades
    // cleanly in external apps — the same contract as the Copy button.
    //
    // Serializing via view.serializeForClipboard (rather than a plain DOMSerializer
    // fragment dump) keeps ProseMirror's own `data-pm-slice` marker on the output,
    // so handlePaste's data-pm-slice check still recognizes editor-to-editor pastes
    // and reconstructs the exact slice instead of re-parsing sanitized HTML.
    const handleCopy = React.useCallback((view: EditorView, event: ClipboardEvent) => {
      const { state } = view
      if (state.selection.empty || !event.clipboardData) return false

      const { dom } = view.serializeForClipboard(state.selection.content())

      const payload = NoteClipboardService.buildPayload(dom.innerHTML)
      if (!payload.html) return false

      event.clipboardData.setData("text/html", payload.html)
      event.clipboardData.setData("text/plain", payload.text)
      event.preventDefault()
      return true
    }, [])

    const handleToggleSpellcheck = React.useCallback(() => {
      setSpellcheckEnabled((prev) => {
        const next = !prev
        try {
          localStorage.setItem(SPELLCHECK_ENABLED_KEY, String(next))
        } catch {
          // Ignore
        }
        return next
      })
    }, [])

    const editorProps = React.useMemo(() => ({
      attributes: {
        class: "focus:outline-none",
        spellcheck: spellcheckEnabled ? "true" : "false",
      },
      handlePaste,
      handleDOMEvents: {
        copy: handleCopy,
      },
    }), [handlePaste, handleCopy, spellcheckEnabled])

    const applyChunkFocusRequest = React.useCallback((targetEditor: Editor, request: ChunkScrollTarget) => {
      if (lastAppliedChunkFocusRequestIdRef.current === request.requestId) {
        return true
      }

      const applied = scrollEditorToChunk(targetEditor, request.charOffset, request.chunkLength)
      if (!applied) return false

      lastAppliedChunkFocusRequestIdRef.current = request.requestId
      onChunkFocusApplied?.(request.requestId)
      return true
    }, [onChunkFocusApplied])

    const editor = useEditor({
      immediatelyRender: false,
      extensions: editorExtensions,
      content: initialContent,
      onCreate: ({ editor: e }) => {
        updateHistoryState(getHistoryState(e))
        if (pendingChunkFocusRef.current !== null) {
          const request = pendingChunkFocusRef.current
          if (applyChunkFocusRequest(e, request)) {
            pendingChunkFocusRef.current = null
          }
        }
        // Execute any scroll that was requested before the editor finished initializing.
        if (pendingChunkScrollRef.current !== null) {
          const { charOffset, chunkLength } = pendingChunkScrollRef.current
          pendingChunkScrollRef.current = null
          scrollEditorToChunk(e, charOffset, chunkLength)
        }
      },
      onTransaction: ({ editor: e }) => {
        updateHistoryState(getHistoryState(e))
      },
      onUpdate: () => {
        if (suppressNextUpdateRef.current) {
          suppressNextUpdateRef.current = false
          return
        }
        onContentChange?.()
      },
      onSelectionUpdate: ({ editor: e }) => {
        const { from, to } = e.state.selection
        setHasSelection(from !== to)
      },
      editorProps,
    })

    React.useEffect(() => {
      editorRef.current = editor
      if (!editor) {
        updateHistoryState(EMPTY_HISTORY_STATE)
      }
      return () => {
        if (editorRef.current === editor) {
          editorRef.current = null
        }
      }
    }, [editor, updateHistoryState])

    React.useEffect(() => {
      if (!chunkFocusRequest) return

      pendingChunkFocusRef.current = chunkFocusRequest
      if (!editor) return

      if (applyChunkFocusRequest(editor, chunkFocusRequest)) {
        pendingChunkFocusRef.current = null
      }
    }, [applyChunkFocusRequest, chunkFocusRequest, editor])

    const handleEditorContainerMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return

      const target = event.target
      if (!(target instanceof HTMLElement)) return

      const editorRoot = editor.view.dom as unknown as HTMLElement

      // If the user clicked inside actual content (e.g. a paragraph/text node), let ProseMirror
      // handle caret placement (don't override mid-text clicks).
      if (editorRoot.contains(target) && editorRoot !== target) return

      const result = placeCaretFromCoords(editor.view, event.clientX, event.clientY)
      if (result.handled) {
        event.preventDefault()
      }
    }, [editor])

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      setContent: (html: string) => {
        if (!editor) return
        const document = createDocument(html, editor.schema, editor.options.parseOptions, {
          errorOnInvalidContent: editor.options.enableContentCheck,
        })
        const tr = editor.state.tr
          .replaceWith(0, editor.state.doc.content.size, document)
          .setMeta("preventUpdate", true)
          .setMeta("addToHistory", false)
        editor.view.dispatch(tr)
      },
      runCommand: (command: string, ...args: unknown[]) => {
        if (!editor) return
        executeEditorCommand({
          editor,
          command,
          args,
          onApplySelectionAsMarkdown: handleApplySelectionAsMarkdown,
        })
      },
      scrollToChunk: (charOffset: number, chunkLength: number) => {
        if (!editor) {
          // Editor not ready yet (TipTap still initializing) — queue for onCreate.
          pendingChunkScrollRef.current = { requestId: "imperative", charOffset, chunkLength }
          return
        }
        pendingChunkScrollRef.current = null
        scrollEditorToChunk(editor, charOffset, chunkLength)
      },
    }), [editor, handleApplySelectionAsMarkdown])

    return (
      <div className={`bg-background transition-all duration-200 ${hideToolbar ? '' : 'border border-border/40 rounded-xl shadow-sm'}`}>
        {!hideToolbar && (
          <EditorMenuBar
            editor={editor}
            historyState={historyState}
            onUndo={handleUndo}
            onRedo={handleRedo}
            hasSelection={hasSelection}
            onApplyMarkdown={handleApplySelectionAsMarkdown}
            spellcheckEnabled={spellcheckEnabled}
            onToggleSpellcheck={handleToggleSpellcheck}
          />
        )}
        <div role="presentation" onMouseDown={handleEditorContainerMouseDown}>
          <EditorContent
            data-cy="editor-content"
            editor={editor}
            className={`${NOTE_CONTENT_CLASS} min-h-[400px] px-6 py-4`}
          />
        </div>
      </div>
    )
  })

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor

