"use client"

import * as React from "react"
import { EditorContent, useEditor, type Extensions } from "@tiptap/react"
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
        levels: [1, 2, 3],
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

  const editorProps = React.useMemo(
    () => ({
      attributes: {
        class: "focus:outline-none",
      },
    }),
    []
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initialContent,
    onUpdate: () => {
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

  React.useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editor?.getHTML() ?? "",
      setContent: (html: string) => {
        editor?.commands.setContent(html)
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
    <div className="bg-background">
      <EditorContent
        editor={editor}
        className={`${NOTE_CONTENT_CLASS} min-h-[400px] px-6 py-4`}
      />
    </div>
  )
})

RichTextEditorWebView.displayName = "RichTextEditorWebView"

export default RichTextEditorWebView
