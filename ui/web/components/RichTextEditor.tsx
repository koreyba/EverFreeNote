"use client"

import * as React from "react"
import {
  useEditor,
  EditorContent,
  type Editor,
  type Extensions,
} from "@tiptap/react"
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
import { Button } from "@ui/web/components/ui/button"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Outdent,
  Palette,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/web/components/ui/popover"
import { TwitterPicker, type ColorResult } from "react-color"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/web/components/ui/select"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import FontFamily from "@tiptap/extension-font-family"
import Heading from "@tiptap/extension-heading"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/web/components/ui/tooltip"

import { FontSize } from "@/extensions/FontSize"
import { browser } from "@ui/web/adapters/browser"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"

type RichTextEditorProps = {
  content: string
  onChange: (html: string) => void
}

const DEBOUNCE_MS = 250

type MenuBarProps = {
  editor: Editor | null
}

const fontFamilies = ["Sans Serif", "Serif", "Monospace", "Cursive"]
const fontSizes = ["10", "11", "12", "13", "14", "15", "18", "24", "30", "36"]

const MenuBar = ({ editor }: MenuBarProps) => {
  if (!editor) {
    return null
  }

  const addImage = () => {
    const url = browser.prompt("Image URL:")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="bold-button"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="italic-button"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="underline-button"
              variant={editor.isActive("underline") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline (Ctrl+U)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="strike-button"
              variant={editor.isActive("strike") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="highlight-button"
              variant={editor.isActive("highlight") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Highlight</TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button data-cy="color-button" variant="ghost" size="sm">
                  <Palette className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Text color</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-0">
            <TwitterPicker
              data-cy="color-picker"
              color={editor.getAttributes("textStyle").color}
              onChange={(color: ColorResult) =>
                editor.chain().focus().setColor(color.hex).run()
              }
            />
          </PopoverContent>
        </Popover>

        <Select
          onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
          defaultValue={fontFamilies[0]}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger data-cy="font-family-select" className="w-[120px] text-xs h-8">
                <SelectValue placeholder="Font Family" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font family</TooltipContent>
          </Tooltip>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) => editor.chain().focus().setFontSize(`${value}pt`).run()}
          defaultValue={fontSizes[2]}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger data-cy="font-size-select" className="w-[70px] text-xs h-8">
                <SelectValue placeholder="Font Size" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font size</TooltipContent>
          </Tooltip>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size} className="text-xs">
                {size} pt
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="h1-button"
              variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}
            >
              <Heading1 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 1</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="h2-button"
              variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}
            >
              <Heading2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 2</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="h3-button"
              variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}
            >
              <Heading3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 3</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="paragraph-button"
              variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              P
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paragraph</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="bullet-list-button"
              variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet list</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="ordered-list-button"
              variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered list</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="task-list-button"
              variant={editor.isActive("taskList") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <CheckSquare className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Task list</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="link-button"
              variant={editor.isActive("link") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                const url = browser.prompt("URL")
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
              }}
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert link</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="image-button"
              variant={editor.isActive("image") ? "secondary" : "ghost"}
              size="sm"
              onClick={addImage}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert image</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="align-left-button"
              variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align left</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="align-center-button"
              variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="align-right-button"
              variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align right</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="indent-button"
              size="sm"
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              disabled={!editor.can().sinkListItem("listItem")}
            >
              <Indent className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Indent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="outdent-button"
              size="sm"
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              disabled={!editor.can().liftListItem("listItem")}
            >
              <Outdent className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Outdent</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="superscript-button"
              variant={editor.isActive("superscript") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Superscript</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-cy="subscript-button"
              variant={editor.isActive("subscript") ? "secondary" : "ghost"}
              size="sm"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Subscript</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const debouncedOnChange = useDebouncedCallback((html: string) => {
    onChange(html)
  }, DEBOUNCE_MS)
  // Мемоизация конфигурации расширений для предотвращения пересоздания
  const editorExtensions: Extensions = React.useMemo(() => [
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
  ], [])

  // Мемоизация editorProps для предотвращения ре-рендеров
  const editorProps = React.useMemo(() => ({
    attributes: {
      class: "focus:outline-none",
    },
  }), [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content,
    onUpdate: ({ editor }) => {
      debouncedOnChange(editor.getHTML())
    },
    editorProps,
  })

  // Sync content when it changes externally (e.g. switching notes)
  React.useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  return (
    <div className="border rounded-md bg-background">
      <MenuBar editor={editor} />
      <EditorContent
        data-cy="editor-content"
        editor={editor}
        className={`${NOTE_CONTENT_CLASS} min-h-[400px] px-6 py-4`}
      />
    </div>
  )
}

export default RichTextEditor
