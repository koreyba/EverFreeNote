"use client"

import * as React from "react"
import { useEditorState, type Editor } from "@tiptap/react"
import { Button } from "@ui/web/components/ui/button"
import { TextAlignCenter as AlignCenter, TextAlignLeft as AlignLeft, TextAlignRight as AlignRight, TextB as Bold, ArrowUUpLeft as Undo, ArrowUUpRight as Redo, CheckSquare, TextHOne as Heading1, TextHTwo as Heading2, TextHThree as Heading3, Highlighter, Image as ImageIcon, TextIndent as Indent, TextItalic as Italic, LinkSimple as Link2, List, ListNumbers as ListOrdered, Minus, TextOutdent as Outdent, Palette, TextTSlash as RemoveFormatting, TextAa as SpellCheck, TextStrikethrough as Strikethrough, TextSubscript as SubscriptIcon, TextSuperscript as SuperscriptIcon, TextUnderline as UnderlineIcon } from "@phosphor-icons/react"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/web/components/ui/popover"
import { TwitterPicker, type ColorResult } from "react-color"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/web/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/web/components/ui/tooltip"
import { browser } from "@ui/web/adapters/browser"
import { EditorToolbarButton } from "./EditorToolbarButton"
import { EditorToolbarMenu } from "./EditorToolbarMenu"
import { cn } from "@ui/web/lib/utils"
import { useToolbarDrag } from "@ui/web/hooks/useToolbarDrag"

export type HistoryState = {
  canUndo: boolean
  canRedo: boolean
}

export type EditorMenuBarProps = {
  compact?: boolean
  editor: Editor | null
  historyState: HistoryState
  onUndo: () => void
  onRedo: () => void
  hasSelection: boolean
  onApplyMarkdown: () => void
  spellcheckEnabled: boolean
  onToggleSpellcheck: () => void
}

const fontFamilies = ["Sans Serif", "Serif", "Monospace", "Cursive"]
const fontSizes = ["10", "11", "12", "13", "14", "15", "18", "24", "30", "36"]

export const EditorMenuBar = ({
  compact = false,
  editor,
  historyState,
  onUndo,
  onRedo,
  hasSelection,
  onApplyMarkdown,
  spellcheckEnabled,
  onToggleSpellcheck,
}: EditorMenuBarProps) => {
  const toolbarDrag = useToolbarDrag(compact)
  const [fontMenuOpen, setFontMenuOpen] = React.useState(false)
  const [sizeMenuOpen, setSizeMenuOpen] = React.useState(false)

  // Tiptap 3 does not rerender useEditor on transactions by default. Subscribe
  // only to formatting state so menus follow the caret without rerendering the
  // whole note for every keystroke.
  useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      formats: ["bold", "italic", "underline", "strike", "highlight", "paragraph", "bulletList", "orderedList", "taskList", "link", "image", "superscript", "subscript"].map(name => current.isActive(name)),
      headings: [1, 2, 3].map(level => current.isActive("heading", { level })),
      alignment: ["left", "center", "right"].map(textAlign => current.isActive({ textAlign })),
      textStyle: current.getAttributes("textStyle"),
      canIndent: current.can().sinkListItem("listItem"),
      canOutdent: current.can().liftListItem("listItem"),
    } : null,
  })

  if (!editor) return null

  const addImage = () => {
    const url = browser.prompt("Image URL:")
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const heading = [1, 2, 3].find(level => editor.isActive("heading", { level }))
  const textStyle = heading ? `h${heading}` : "paragraph"
  const alignment = ["left", "center", "right"].find(value => editor.isActive({ textAlign: value })) ?? "left"
  const listType = ["bulletList", "orderedList", "taskList"].find(value => editor.isActive(value)) ?? "none"
  const listOptions = [
    { value: "bulletList", label: "Bullet list", apply: () => editor.chain().focus().toggleBulletList().run() },
    { value: "orderedList", label: "Numbered list", apply: () => editor.chain().focus().toggleOrderedList().run() },
    { value: "taskList", label: "Task list", apply: () => editor.chain().focus().toggleTaskList().run() },
  ]

  const historyControls = (
    <>
      <EditorToolbarButton dataCy="undo-button" label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!historyState.canUndo} ariaLabel="Undo">
        <Undo className="w-4 h-4" />
      </EditorToolbarButton>
      <EditorToolbarButton dataCy="redo-button" label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!historyState.canRedo} ariaLabel="Redo">
        <Redo className="w-4 h-4" />
      </EditorToolbarButton>
      <div className="w-px h-5 shrink-0 bg-border mx-0.5" />
    </>
  )

  return (
    <TooltipProvider delayDuration={150}>
      {/* The offset follows the real height of the note action bar, which
          NoteEditor publishes as --note-editor-header-h (globals.css holds the
          fallback). A hardcoded value drifts whenever that bar changes
          (responsive padding, the "Saving…" caption) and leaves a strip of
          scrolling text between the two. */}
      <div
        {...toolbarDrag}
        data-editor-toolbar
        data-mobile-scroll-ignore
        role="toolbar"
        aria-label="Note formatting"
        className={cn(
          "flex items-center bg-background/95",
          compact
            ? "h-[52px] flex-nowrap gap-0.5 overflow-x-auto overscroll-x-contain touch-pan-x select-none scrollbar-none px-1 [&>button]:h-11 [&>button]:min-w-11 [&>button]:shrink-0"
            : "sticky top-[var(--note-editor-header-h)] z-20 flex-wrap gap-1.5 border-b border-border/40 backdrop-blur-md p-2 shadow-sm rounded-t-xl"
        )}
      >

        {!compact && historyControls}

        {compact && (
          <EditorToolbarMenu
            label="Text style"
            value={textStyle}
            options={[
              { value: "paragraph", label: "Paragraph", apply: () => editor.chain().focus().setParagraph().run() },
              ...([1, 2, 3] as const).map(level => ({
                value: `h${level}`, label: `Heading ${level}`,
                apply: () => editor.chain().focus().setHeading({ level }).run(),
              })),
            ]}
          >
            <span className="text-xs font-semibold">{heading ? `H${heading}` : "P"}</span>
          </EditorToolbarMenu>
        )}

        {compact ? (
          <EditorToolbarMenu
            label="Text formatting"
            multiple
            options={[
              { value: "bold", label: "Bold", checked: editor.isActive("bold"), apply: () => editor.chain().focus().toggleBold().run() },
              { value: "italic", label: "Italic", checked: editor.isActive("italic"), apply: () => editor.chain().focus().toggleItalic().run() },
              { value: "underline", label: "Underline", checked: editor.isActive("underline"), apply: () => editor.chain().focus().toggleUnderline().run() },
              { value: "strike", label: "Strikethrough", checked: editor.isActive("strike"), apply: () => editor.chain().focus().toggleStrike().run() },
            ]}
          >
            <Bold className="h-4 w-4" />
          </EditorToolbarMenu>
        ) : (<>
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
        </>)}
        {/* Mobile primary controls come first in DOM and keyboard order. */}
        {compact && (
          <EditorToolbarMenu
            label="Lists"
            value={listType}
            options={[
              { value: "none", label: "No list", apply: () => listOptions.find(option => option.value === listType)?.apply() },
              ...listOptions,
            ]}
          >
            {listType === "taskList" ? <CheckSquare className="h-4 w-4" /> : listType === "orderedList" ? <ListOrdered className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </EditorToolbarMenu>
        )}
        {compact && (
          <EditorToolbarMenu
            label="Text alignment"
            value={alignment}
            options={["left", "center", "right"].map(value => ({
              value, label: `Align ${value}`, apply: () => editor.chain().focus().setTextAlign(value).run(),
            }))}
          >
            {alignment === "center" ? <AlignCenter className="h-4 w-4" /> : alignment === "right" ? <AlignRight className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
          </EditorToolbarMenu>
        )}

        {compact && historyControls}

        <EditorToolbarButton dataCy="highlight-button" label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Color picker — custom structure (PopoverTrigger inside Tooltip) */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button data-cy="color-button" variant="ghost" size="sm" aria-label="Text color">
                  <Palette className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Text color</TooltipContent>
          </Tooltip>
          <PopoverContent side={compact ? "top" : "bottom"} className="w-auto p-0">
            <TwitterPicker
              data-cy="color-picker"
              color={editor.getAttributes("textStyle").color}
              onChange={(color: ColorResult) => editor.chain().focus().setColor(color.hex).run()}
            />
          </PopoverContent>
        </Popover>

        {/* Font family */}
        <Select open={compact ? fontMenuOpen : undefined} onOpenChange={setFontMenuOpen} onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()} value={editor.getAttributes("textStyle").fontFamily || fontFamilies[0]}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                data-cy="font-family-button"
                className={cn("text-xs h-8", compact ? "w-12 gap-1 px-2" : "w-[120px]")}
                aria-label="Font family"
                onPointerDown={compact ? event => event.preventDefault() : undefined}
                onClick={compact ? event => { event.preventDefault(); setFontMenuOpen(true) } : undefined}
              >
                {compact ? <span className="text-sm" aria-hidden="true">Aa</span> : <SelectValue placeholder="Font Family" />}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font family</TooltipContent>
          </Tooltip>
          <SelectContent side={compact ? "top" : "bottom"}>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">{font}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font size */}
        <Select open={compact ? sizeMenuOpen : undefined} onOpenChange={setSizeMenuOpen} onValueChange={(value) => editor.chain().focus().setFontSize(`${value}pt`).run()} value={editor.getAttributes("textStyle").fontSize?.replace("pt", "") || fontSizes[2]}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                data-cy="font-size-button" className="w-[70px] text-xs h-8" aria-label="Font size"
                onPointerDown={compact ? event => event.preventDefault() : undefined}
                onClick={compact ? event => { event.preventDefault(); setSizeMenuOpen(true) } : undefined}
              >
                <SelectValue placeholder="Font Size" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font size</TooltipContent>
          </Tooltip>
          <SelectContent side={compact ? "top" : "bottom"}>
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size} className="text-xs">{size} pt</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!compact && (<>
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
        </>)}
        <EditorToolbarButton dataCy="horizontal-rule-button" label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </EditorToolbarButton>

        {!compact && (<>
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

        </>)}

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

        {!compact && (<>
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
        </>)}
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
        <EditorToolbarButton
          dataCy="toggle-spellcheck-button"
          label={spellcheckEnabled ? "Disable Spellcheck" : "Enable Spellcheck"}
          active={spellcheckEnabled}
          onClick={onToggleSpellcheck}
          ariaLabel="Toggle Spellcheck"
        >
          <SpellCheck className="w-4 h-4" />
        </EditorToolbarButton>

      </div>
    </TooltipProvider>
  )
}
