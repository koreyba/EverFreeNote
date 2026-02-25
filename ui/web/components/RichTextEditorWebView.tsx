"use client"

import * as React from "react"
import { EditorContent, useEditor, type Editor, type Extensions } from "@tiptap/react"
import { createDocument } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import TextAlign from "@tiptap/extension-text-align"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import FontFamily from "@tiptap/extension-font-family"
import Heading from "@tiptap/extension-heading"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { FontSize } from "@/extensions/FontSize"
import { SmartPasteService } from "@core/services/smartPaste"
import { placeCaretFromCoords } from "@core/utils/prosemirrorCaret"
import { applySelectionAsMarkdown } from "@ui/web/lib/editor"

export type RichTextEditorWebViewHandle = {
  getHTML: () => string
  setContent: (html: string) => void
  runCommand: (command: string, ...args: unknown[]) => void
}

type RichTextEditorWebViewProps = {
  initialContent: string
  onContentChange?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onSelectionChange?: (hasSelection: boolean) => void
  onHistoryStateChange?: (state: { canUndo: boolean; canRedo: boolean }) => void
}

const RichTextEditorWebView = React.forwardRef<
  RichTextEditorWebViewHandle,
  RichTextEditorWebViewProps
>(({ initialContent, onContentChange, onFocus, onBlur, onSelectionChange, onHistoryStateChange }, ref) => {
  const editorRef = React.useRef<Editor | null>(null)
  const suppressNextUpdateRef = React.useRef(false)

  const handleApplySelectionAsMarkdown = React.useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    applySelectionAsMarkdown(editor, onContentChange)
  }, [onContentChange])

  const editorExtensions: Extensions = React.useMemo(
    () => [
      StarterKit.configure({
        bulletList: {},
        orderedList: {},
        listItem: {},
        heading: false,
        link: false,
        underline: false,
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    []
  )

  const handlePaste = React.useCallback((_: unknown, event: ClipboardEvent) => {
    if (!event.clipboardData) return false
    const editor = editorRef.current
    if (!editor) return false

    const payload = SmartPasteService.buildPayload(event)
    if (!payload.html && !payload.text) return false

    const result = SmartPasteService.resolvePaste(payload)
    event.preventDefault()
    suppressNextUpdateRef.current = true
    editor.chain().focus().insertContent(result.html).run()

    // Explicitly trigger onContentChange after paste
    // Mobile WebView may not reliably fire onUpdate after insertContent
    onContentChange?.()

    return true
  }, [onContentChange])

  // Handle background clicks (padding/gaps) in a ProseMirror-native way.
  // This prevents "jump to end" when clicking internal vertical gaps (e.g. after headings),
  // while still allowing bottom-tail clicks to append at the end.
  const handleClick = React.useCallback(
    (_view: unknown, _pos: number, event: MouseEvent) => {
      const editor = editorRef.current
      if (!editor) return false

      const target = event.target
      const root = editor.view.dom

      // Only take over when clicking the editor root/background.
      // For clicks inside actual content nodes, let ProseMirror handle caret placement.
      if (target instanceof HTMLElement && root.contains(target) && target !== root) {
        return false
      }

      const result = placeCaretFromCoords(editor.view, event.clientX, event.clientY)
      return result.handled
    },
    []
  )

  const editorProps = React.useMemo(
    () => ({
      attributes: {
        class: "focus:outline-none",
      },
      handlePaste,
      handleClick,
    }),
    [handlePaste, handleClick]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initialContent,
    onCreate: ({ editor: e }) => {
      onHistoryStateChange?.({
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      })
    },
    onTransaction: ({ editor: e }) => {
      onHistoryStateChange?.({
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      })
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
      onSelectionChange?.(from !== to)
    },
    onFocus: () => {
      onFocus?.()
    },
    onBlur: () => {
      onBlur?.()
    },
    editorProps,
  })

  React.useEffect(() => {
    editorRef.current = editor
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null
      }
    }
  }, [editor])

  React.useImperativeHandle(
    ref,
    () => ({
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
        if (command === 'applySelectionAsMarkdown') {
          handleApplySelectionAsMarkdown()
          return
        }
        const cmd = (
          editor.chain().focus() as unknown as Record<
            string,
            (...a: unknown[]) => { run: () => void }
          >
        )[command]
        if (typeof cmd === "function") {
          cmd(...args).run()
        }
      },
    }),
    [editor, handleApplySelectionAsMarkdown]
  )

  return (
    <div className="bg-background min-h-screen" onClick={() => editor?.commands.focus()}>
      <EditorContent
        editor={editor}
        className={`${NOTE_CONTENT_CLASS} min-h-screen px-6 py-4 [&_.tiptap]:min-h-[calc(100vh-2rem)] [&_.tiptap]:cursor-text`}
      />
    </div>
  )
})

RichTextEditorWebView.displayName = "RichTextEditorWebView"

export default RichTextEditorWebView
