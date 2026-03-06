"use client"

import * as React from "react"
import {
  useEditor,
  EditorContent,
  type Editor,
} from "@tiptap/react"
import { createDocument } from "@tiptap/core"
import { TextSelection } from "@tiptap/pm/state"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SmartPasteService } from "@core/services/smartPaste"
import { placeCaretFromCoords } from "@core/utils/prosemirrorCaret"
import { applySelectionAsMarkdown } from "@ui/web/lib/editor"
import { EditorMenuBar, type HistoryState } from "./EditorMenuBar"
import { editorExtensions } from "./editorExtensions"
import { CHUNK_FOCUS_KEY } from "@/extensions/ChunkFocus"

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
  onChunkFocusApplied?: () => void
}

const EMPTY_HISTORY_STATE: HistoryState = { canUndo: false, canRedo: false }

const areHistoryStatesEqual = (left: HistoryState, right: HistoryState) =>
  left.canUndo === right.canUndo && left.canRedo === right.canRedo

const getHistoryState = (editor: Editor): HistoryState => ({
  canUndo: editor.can().undo(),
  canRedo: editor.can().redo(),
})

type ChunkScrollTarget = {
  charOffset: number
  chunkLength: number
}

type BlockRange = {
  from: number
  to: number
}

type ChunkBlockRangesResult = {
  ranges: BlockRange[]
  firstFocusPos: number | null
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

    plainTextOffset = blockEnd + 1 // +1 mirrors the separator inserted by stripHtml block boundaries
    return false
  })

  return { ranges: Array.from(rangeMap.values()), firstFocusPos }
}

/** Highlight the blocks intersecting the chunk range and scroll the first block into view. */
function doScrollToChunk(editor: Editor, charOffset: number, chunkLength: number): boolean {
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
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}

const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ initialContent, onContentChange, hideToolbar = false, onChunkFocusApplied }, ref) => {
    const editorRef = React.useRef<Editor | null>(null)
    const suppressNextUpdateRef = React.useRef(false)
    // Queues a scroll request when scrollToChunk is called before the editor is ready.
    const pendingChunkScrollRef = React.useRef<ChunkScrollTarget | null>(null)
    const [hasSelection, setHasSelection] = React.useState(false)
    const [historyState, setHistoryState] = React.useState<HistoryState>(EMPTY_HISTORY_STATE)

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

    const editorProps = React.useMemo(() => ({
      attributes: {
        class: "focus:outline-none",
      },
      handlePaste,
    }), [handlePaste])

    const editor = useEditor({
      immediatelyRender: false,
      extensions: editorExtensions,
      content: initialContent,
      onCreate: ({ editor: e }) => {
        updateHistoryState(getHistoryState(e))
        // Execute any scroll that was requested before the editor finished initializing.
        if (pendingChunkScrollRef.current !== null) {
          const { charOffset, chunkLength } = pendingChunkScrollRef.current
          pendingChunkScrollRef.current = null
          if (doScrollToChunk(e, charOffset, chunkLength)) {
            onChunkFocusApplied?.()
          }
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
        if (command === "undo") {
          editor.commands.undo()
          return
        }
        if (command === "redo") {
          editor.commands.redo()
          return
        }
        const cmd = (editor.chain().focus() as unknown as Record<string, (...a: unknown[]) => { run: () => void }>)[command]
        if (typeof cmd === 'function') {
          cmd(...args).run()
        }
      },
      scrollToChunk: (charOffset: number, chunkLength: number) => {
        if (!editor) {
          // Editor not ready yet (TipTap still initializing) — queue for onCreate.
          pendingChunkScrollRef.current = { charOffset, chunkLength }
          return
        }
        pendingChunkScrollRef.current = null
        if (doScrollToChunk(editor, charOffset, chunkLength)) {
          onChunkFocusApplied?.()
        }
      },
    }), [editor, onChunkFocusApplied])

    return (
      <div className={`bg-background ${hideToolbar ? '' : 'border border-t-0 rounded-b-md rounded-t-none'}`}>
        {!hideToolbar && (
          <EditorMenuBar
            editor={editor}
            historyState={historyState}
            onUndo={handleUndo}
            onRedo={handleRedo}
            hasSelection={hasSelection}
            onApplyMarkdown={handleApplySelectionAsMarkdown}
          />
        )}
        <div onMouseDown={handleEditorContainerMouseDown}>
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
