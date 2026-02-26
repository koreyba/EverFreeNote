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
import type { Extensions } from "@tiptap/react"
import { FontSize } from "@/extensions/FontSize"

/**
 * Shared TipTap extension configuration used by both RichTextEditor and RichTextEditorWebView.
 * Defined at module level — extension instances are stateless config objects, safe to share.
 */
export const editorExtensions: Extensions = [
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
]
