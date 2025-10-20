'use client'

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import {
  Underline as UnderlineIcon,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Palette
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TwitterPicker } from 'react-color'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'

import { FontSize } from '../extensions/FontSize'
import Heading from '@tiptap/extension-heading'

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null
  }

  const fontFamilies = ['Sans Serif', 'Serif', 'Monospace', 'Cursive'];
  const fontSizes = ['12', '15', '18', '24', '30', '36'];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      <Button data-cy="bold-button" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></Button>
      <Button data-cy="italic-button" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></Button>
      <Button data-cy="underline-button" variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></Button>
      <Button data-cy="strike-button" variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></Button>
      <Button data-cy="highlight-button" variant={editor.isActive('highlight') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="w-4 h-4" /></Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button data-cy="color-button" variant="ghost" size="sm"><Palette className="w-4 h-4" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <TwitterPicker data-cy="color-picker" color={editor.getAttributes('textStyle').color} onChange={(color) => editor.chain().focus().setColor(color.hex).run()} />
        </PopoverContent>
      </Popover>

      <Select data-cy="font-family-select" onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()} defaultValue={fontFamilies[0]}>
        <SelectTrigger className="w-[120px] text-xs h-8">
          <SelectValue placeholder="Font Family" />
        </SelectTrigger>
        <SelectContent>
          {fontFamilies.map(font => <SelectItem key={font} value={font} className="text-xs">{font}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select data-cy="font-size-select" onValueChange={(value) => editor.chain().focus().setFontSize(`${value}pt`).run()} defaultValue={fontSizes[1]}>
        <SelectTrigger className="w-[70px] text-xs h-8">
          <SelectValue placeholder="Font Size" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map(size => <SelectItem key={size} value={size} className="text-xs">{size} pt</SelectItem>)}
        </SelectContent>
      </Select>

      <Button data-cy="h1-button" variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></Button>
      <Button data-cy="h2-button" variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></Button>
      <Button data-cy="h3-button" variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></Button>
      <Button data-cy="paragraph-button" variant={editor.isActive('paragraph') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setParagraph().run()}>P</Button>

      <Button data-cy="bullet-list-button" variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Button>
      <Button data-cy="ordered-list-button" variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Button>
      <Button data-cy="task-list-button" variant={editor.isActive('taskList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare className="w-4 h-4" /></Button>
      <Button data-cy="link-button" variant={editor.isActive('link') ? 'secondary' : 'ghost'} size="sm" onClick={() => { const url = window.prompt('URL'); if (url) { editor.chain().focus().setLink({ href: url }).run() } }}><Link2 className="w-4 h-4" /></Button>

      <Button data-cy="align-left-button" variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></Button>
      <Button data-cy="align-center-button" variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></Button>
      <Button data-cy="align-right-button" variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></Button>

      <Button data-cy="indent-button" size="sm" onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')}><Indent className="w-4 h-4" /></Button>
      <Button data-cy="outdent-button" size="sm" onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')}><Outdent className="w-4 h-4" /></Button>

      <Button data-cy="superscript-button" variant={editor.isActive('superscript') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleSuperscript().run()}><SuperscriptIcon className="w-4 h-4" /></Button>
      <Button data-cy="subscript-button" variant={editor.isActive('subscript') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleSubscript().run()}><SubscriptIcon className="w-4 h-4" /></Button>
    </div>
  )
}

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {},
        orderedList: {},
        listItem: {},
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-neutral dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none max-w-none',
      },
    },
  })

  return (
    <div className="border rounded-md bg-background">
      <MenuBar editor={editor} />
      <EditorContent data-cy="editor-content" editor={editor} className="min-h-[200px]" />
    </div>
  )
}

export default RichTextEditor

