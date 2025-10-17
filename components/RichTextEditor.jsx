
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
  Subscript as SubscriptIcon
} from 'lucide-react'

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null
  }

  const buttons = [
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
    { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), isActive: editor.isActive('highlight') },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), isActive: editor.isActive('taskList') },
    { icon: Link2, action: () => { const url = window.prompt('URL'); if (url) { editor.chain().focus().setLink({ href: url }).run() } }, isActive: editor.isActive('link') },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), isActive: editor.isActive({ textAlign: 'left' }) },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), isActive: editor.isActive({ textAlign: 'center' }) },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), isActive: editor.isActive({ textAlign: 'right' }) },
    { icon: Indent, action: () => editor.chain().focus().sinkListItem('listItem').run(), disabled: !editor.can().sinkListItem('listItem') },
    { icon: Outdent, action: () => editor.chain().focus().liftListItem('listItem').run(), disabled: !editor.can().liftListItem('listItem') },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike') },
    { icon: SuperscriptIcon, action: () => editor.chain().focus().toggleSuperscript().run(), isActive: editor.isActive('superscript') },
    { icon: SubscriptIcon, action: () => editor.chain().focus().toggleSubscript().run(), isActive: editor.isActive('subscript') },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
      {buttons.map((btn, index) => (
        <Button
          key={index}
          variant={btn.isActive ? 'secondary' : 'ghost'}
          size="sm"
          onClick={btn.action}
          disabled={btn.disabled}
        >
          <btn.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  )
}

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
      },
    },
  })

  return (
    <div className="border border-gray-200 rounded-md">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

export default RichTextEditor

