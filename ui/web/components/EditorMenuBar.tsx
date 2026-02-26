"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@ui/web/components/ui/button"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Undo,
  Redo,
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
  Minus,
  Outdent,
  Palette,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/web/components/ui/popover"
import { TwitterPicker, type ColorResult } from "react-color"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/web/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/web/components/ui/tooltip"
import { browser } from "@ui/web/adapters/browser"
import { EditorToolbarButton } from "./EditorToolbarButton"

export type HistoryState = {
  canUndo: boolean
  canRedo: boolean
}

export type EditorMenuBarProps = {
  editor: Editor | null
  historyState: HistoryState
  onUndo: () => void
  onRedo: () => void
  hasSelection: boolean
  onApplyMarkdown: () => void
}

const fontFamilies = ["Sans Serif", "Serif", "Monospace", "Cursive"]
const fontSizes = ["10", "11", "12", "13", "14", "15", "18", "24", "30", "36"]

export const EditorMenuBar = ({ editor, historyState, onUndo, onRedo, hasSelection, onApplyMarkdown }: EditorMenuBarProps) => {
  if (!editor) return null

  const addImage = () => {
    const url = browser.prompt("Image URL:")
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="sticky top-[-1px] z-20 flex flex-wrap items-center gap-1 border-b bg-card p-2 shadow-sm">

        {/* History */}
        <EditorToolbarButton dataCy="undo-button" label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!historyState.canUndo} ariaLabel="Undo">
          <Undo className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="redo-button" label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!historyState.canRedo} ariaLabel="Redo">
          <Redo className="w-4 h-4" />
        </EditorToolbarButton>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Inline formatting */}
        <EditorToolbarButton dataCy="bold-button" label="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="italic-button" label="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="underline-button" label="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="strike-button" label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="highlight-button" label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Color picker — custom structure (PopoverTrigger inside Tooltip) */}
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
              onChange={(color: ColorResult) => editor.chain().focus().setColor(color.hex).run()}
            />
          </PopoverContent>
        </Popover>

        {/* Font family */}
        <Select onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()} defaultValue={fontFamilies[0]}>
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
              <SelectItem key={font} value={font} className="text-xs">{font}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font size */}
        <Select onValueChange={(value) => editor.chain().focus().setFontSize(`${value}pt`).run()} defaultValue={fontSizes[2]}>
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
              <SelectItem key={size} value={size} className="text-xs">{size} pt</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Headings & paragraph */}
        <EditorToolbarButton dataCy="h1-button" label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="h2-button" label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="h3-button" label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}>
          <Heading3 className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="paragraph-button" label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          P
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="horizontal-rule-button" label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Lists */}
        <EditorToolbarButton dataCy="bullet-list-button" label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="ordered-list-button" label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="task-list-button" label="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <CheckSquare className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Insert */}
        <EditorToolbarButton
          dataCy="link-button"
          label="Insert link"
          active={editor.isActive("link")}
          onClick={() => {
            const url = browser.prompt("URL")
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <Link2 className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="image-button" label="Insert image" active={editor.isActive("image")} onClick={addImage}>
          <ImageIcon className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Alignment */}
        <EditorToolbarButton dataCy="align-left-button" label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="align-center-button" label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="align-right-button" label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Indent */}
        <EditorToolbarButton dataCy="indent-button" label="Indent" onClick={() => editor.chain().focus().sinkListItem("listItem").run()} disabled={!editor.can().sinkListItem("listItem")}>
          <Indent className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="outdent-button" label="Outdent" onClick={() => editor.chain().focus().liftListItem("listItem").run()} disabled={!editor.can().liftListItem("listItem")}>
          <Outdent className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Script */}
        <EditorToolbarButton dataCy="superscript-button" label="Superscript" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="subscript-button" label="Subscript" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Utilities */}
        <EditorToolbarButton dataCy="clear-formatting-button" label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="apply-markdown-button" label="Apply as Markdown" onClick={onApplyMarkdown} disabled={!hasSelection} ariaLabel="Apply as Markdown">
          MD
        </EditorToolbarButton>

      </div>
    </TooltipProvider>
  )
}
