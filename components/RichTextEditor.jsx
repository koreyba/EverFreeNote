'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator as UiSeparator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const ToolbarGroup = ({ children }) => (
  <div className="flex items-center gap-1">{children}</div>
)

const MenuButton = ({ editor, action, isActive, label, disabled, children }) => (
  <Button
    type="button"
    size="sm"
    variant="ghost"
    onClick={action}
    disabled={disabled}
    className={cn(
      'h-8 px-2 text-sm font-medium',
      isActive && 'bg-green-100 text-green-700 hover:bg-green-100',
      disabled && 'opacity-50'
    )}
    aria-label={label}
  >
    {children ?? label}
  </Button>
)

const Separator = () => <UiSeparator className="mx-1 h-6" orientation="vertical" />

const COLOR_OPTIONS = [
  { label: 'Default', value: null },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
]

const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Placeholder.configure({
    placeholder: 'Start writing your note...',
  }),
  Link.configure({
    openOnClick: false,
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  TextStyle,
  Color.configure({
    types: ['textStyle'],
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
]

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px] text-base',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const current = editor.getHTML()
    if ((value || '') !== current) {
      editor.commands.setContent(value || '', false)
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 text-gray-500">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-2">
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            disabled={!editor?.can().chain().focus().toggleBold().run()}
            label="Bold"
          >
            <span className="font-semibold">B</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            disabled={!editor?.can().chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <span className="italic">I</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            disabled={!editor?.can().chain().focus().toggleUnderline().run()}
            label="Underline"
          >
            <span className="underline">U</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            disabled={!editor?.can().chain().focus().toggleStrike().run()}
            label="Strike"
          >
            <span className="line-through">S</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            disabled={!editor?.can().chain().focus().toggleCode().run()}
            label="Inline code"
          >
            <span className="font-mono text-xs">&lt;/&gt;</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            disabled={!editor?.can().chain().focus().toggleHighlight().run()}
            label="Highlight"
          >
            <span className="bg-yellow-200 px-1">H</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="h-8 px-2">
                <span>Text color</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {COLOR_OPTIONS.map(({ label, value }) => (
                <DropdownMenuItem
                  key={label}
                  onSelect={() => {
                    const chain = editor.chain().focus()
                    if (value) {
                      chain.setColor(value).run()
                    } else {
                      chain.unsetColor().run()
                    }
                  }}
                >
                  <span
                    className="mr-2 inline-block h-3 w-3 rounded-full border"
                    style={{ backgroundColor: value ?? 'transparent' }}
                  />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            disabled={!editor?.can().chain().focus().unsetAllMarks().clearNodes().run()}
            label="Clear formatting"
          >
            <span>Clear</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
            disabled={!editor?.can().chain().focus().setParagraph().run()}
            label="Paragraph"
          >
            <span>P</span>
          </MenuButton>
          {[1, 2, 3].map((level) => (
            <MenuButton
              key={level}
              editor={editor}
              action={() => editor.chain().focus().toggleHeading({ level }).run()}
              isActive={editor.isActive('heading', { level })}
              disabled={!editor?.can().chain().focus().toggleHeading({ level }).run()}
              label={`Heading ${level}`}
            >
              <span>{`H${level}`}</span>
            </MenuButton>
          ))}
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            disabled={!editor?.can().chain().focus().toggleBlockquote().run()}
            label="Blockquote"
          >
            <span>❝</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            disabled={!editor?.can().chain().focus().toggleCodeBlock().run()}
            label="Code block"
          >
            <span className="font-mono text-xs">{`{ }`}</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            disabled={!editor?.can().chain().focus().toggleBulletList().run()}
            label="Bullet list"
          >
            <span>•</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            disabled={!editor?.can().chain().focus().toggleOrderedList().run()}
            label="Numbered list"
          >
            <span>1.</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            disabled={!editor?.can().chain().focus().toggleTaskList().run()}
            label="Task list"
          >
            <span>☑</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            disabled={!editor?.can().chain().focus().setTextAlign('left').run()}
            label="Align left"
          >
            <span>L</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            disabled={!editor?.can().chain().focus().setTextAlign('center').run()}
            label="Align center"
          >
            <span>C</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            disabled={!editor?.can().chain().focus().setTextAlign('right').run()}
            label="Align right"
          >
            <span>R</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            disabled={!editor?.can().chain().focus().setTextAlign('justify').run()}
            label="Justify"
          >
            <span>J</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={!editor?.can().chain().focus().setHorizontalRule().run()}
            label="Horizontal rule"
          >
            <span>―</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().setHardBreak().run()}
            disabled={!editor?.can().chain().focus().setHardBreak().run()}
            label="Line break"
          >
            <span>↵</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => {
              const previousUrl = editor.getAttributes('link').href || ''
              const url = window.prompt('Enter URL', previousUrl)

              if (url === null) {
                return
              }

              if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run()
                return
              }

              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
            }}
            isActive={editor.isActive('link')}
            disabled={!editor?.can().chain().focus().setLink({ href: 'https://example.com' }).run()}
            label="Link"
          >
            <span>🔗</span>
          </MenuButton>
        </ToolbarGroup>
        <Separator />
        <ToolbarGroup>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().undo().run()}
            disabled={!editor?.can().chain().focus().undo().run()}
            label="Undo"
          >
            <span>Undo</span>
          </MenuButton>
          <MenuButton
            editor={editor}
            action={() => editor.chain().focus().redo().run()}
            disabled={!editor?.can().chain().focus().redo().run()}
            label="Redo"
          >
            <span>Redo</span>
          </MenuButton>
        </ToolbarGroup>
      </div>
      <div className="p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
