"use client"

import * as React from "react"
import { EditorContent, useEditor, type Editor, type Extensions } from "@tiptap/react"
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
}

const RichTextEditorWebView = React.forwardRef<
  RichTextEditorWebViewHandle,
  RichTextEditorWebViewProps
>(({ initialContent, onContentChange, onFocus, onBlur }, ref) => {
  const editorRef = React.useRef<Editor | null>(null)
  const suppressNextUpdateRef = React.useRef(false)
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

  // Handle clicks in empty space below content - focus at document end
  const handleClick = React.useCallback(
    (_view: unknown, _pos: number, event: MouseEvent) => {
      const editor = editorRef.current
      if (!editor) return false

      const editorDom = editor.view.dom
      const lastChild = editorDom.lastElementChild

      if (lastChild) {
        const lastRect = lastChild.getBoundingClientRect()
        // If click is below the last content element, focus at end
        if (event.clientY > lastRect.bottom) {
          editor.commands.focus('end')
          return true
        }
      } else {
        // Empty document - focus at end
        editor.commands.focus('end')
        return true
      }

      return false
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
    onUpdate: () => {
      if (suppressNextUpdateRef.current) {
        suppressNextUpdateRef.current = false
        return
      }
      onContentChange?.()
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
        editor?.commands.setContent(html, { emitUpdate: false })
      },
      runCommand: (command: string, ...args: unknown[]) => {
        if (!editor) return
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
    [editor]
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
