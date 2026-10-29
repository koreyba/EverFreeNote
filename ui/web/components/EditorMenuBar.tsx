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
import { useToolbarFocus, type ToolbarFocusOrigin } from "@ui/web/hooks/useToolbarFocus"
import { toast } from "sonner"
import { getImageDescriptionTarget, ImageDescriptionDialog, type ImageDescriptionTarget } from "./ImageDescriptionDialog"

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
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function getPickerSeed(editor: Editor) {
  const explicit = editor.getAttributes("textStyle").color
  if (typeof explicit === "string" && explicit.trim()) return explicit

  const view = editor.view
  const doc = view.dom.ownerDocument
  try {
    // A mixed selection has no single color: use its first position as the
    // preview, falling back to the editor's inherited foreground.
    const node = view.domAtPos(editor.state.selection.from).node
    const element = node.nodeType === 1 ? node as Element : node.parentElement
    const target = element && view.dom.contains(element) ? element : view.dom
    const computed = doc.defaultView?.getComputedStyle(target).color ?? ""
    const canvas = doc.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")
    if (!context || !computed) return "#000000"
    // react-color's parser does not understand computed oklch/color() values.
    context.fillStyle = computed
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data
    return `rgba(${r}, ${g}, ${b}, ${alpha / 255})`
  } catch {
    return "#000000"
  }
}

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
  const { cancelPendingFocus, focusFromToolbar } = useToolbarFocus(editor, true)
  // An old toolbar must not restore focus after switching between layouts.
  React.useLayoutEffect(() => () => cancelPendingFocus(), [compact, cancelPendingFocus])
  const [fontMenuOpen, setFontMenuOpen] = React.useState(false)
  const [sizeMenuOpen, setSizeMenuOpen] = React.useState(false)
  // A delayed tooltip must not become the topmost dismissable layer over an
  // open select, where it would consume the Escape meant for that select.
  const [fontTooltipOpen, setFontTooltipOpen] = React.useState(false)
  const [sizeTooltipOpen, setSizeTooltipOpen] = React.useState(false)
  const [colorMenuOpen, setColorMenuOpen] = React.useState(false)
  const [pickerSeed, setPickerSeed] = React.useState("#000000")
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false)
  const [imageDescriptionTarget, setImageDescriptionTarget] = React.useState<ImageDescriptionTarget | null>(null)
  const fontButtonRef = React.useRef<HTMLButtonElement>(null)
  const fontContentRef = React.useRef<HTMLDivElement>(null)
  const fontAppliedRef = React.useRef(false)
  const sizeButtonRef = React.useRef<HTMLButtonElement>(null)
  const sizeContentRef = React.useRef<HTMLDivElement>(null)
  const sizeAppliedRef = React.useRef(false)
  const colorButtonRef = React.useRef<HTMLButtonElement>(null)
  const colorContentRef = React.useRef<HTMLDivElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const imageButtonRef = React.useRef<HTMLButtonElement>(null)
  const imageCommandAppliedRef = React.useRef(false)

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

  const focusFromControl = (origin: ToolbarFocusOrigin) => {
    return editor.chain().command(focusFromToolbar(origin))
  }

  const addImage = () => {
    setImageMenuOpen(false)
    const url = browser.prompt("Image URL:")
    if (url) {
      imageCommandAppliedRef.current = true
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const describeImage = () => {
    const target = getImageDescriptionTarget(editor)
    if (!target) {
      setImageMenuOpen(false)
      toast.info("No images in this note", { description: "Insert an image first." })
      return
    }
    imageCommandAppliedRef.current = true
    setImageMenuOpen(false)
    setImageDescriptionTarget(target)
  }

  const addImageFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    if (!IMAGE_TYPES.has(file.type)) {
      toast.error("Unsupported image type", { description: "Choose a PNG, JPEG, GIF, or WebP image." })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large", { description: "Choose an image up to 10 MB." })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (editor.isDestroyed || typeof reader.result !== "string") return
      const source = reader.result
      const image = new Image()
      image.onload = () => {
        if (!editor.isDestroyed) editor.chain().focus().setImage({ src: source }).run()
      }
      image.onerror = () => {
        if (!editor.isDestroyed) toast.error("Could not read the image", { description: "Try choosing the file again." })
      }
      image.src = source
    }
    reader.onerror = () => toast.error("Could not read the image", { description: "Try choosing the file again." })
    reader.readAsDataURL(file)
  }

  const heading = [1, 2, 3].find(level => editor.isActive("heading", { level }))
  const textStyle = heading ? `h${heading}` : "paragraph"
  const alignment = ["left", "center", "right"].find(value => editor.isActive({ textAlign: value })) ?? "left"
  const listType = ["bulletList", "orderedList", "taskList"].find(value => editor.isActive(value)) ?? "none"
  const listOptions = [
    { value: "bulletList", label: "Bullet list", apply: (origin: ToolbarFocusOrigin) => editor.chain().command(focusFromToolbar(origin)).toggleBulletList().run() },
    { value: "orderedList", label: "Numbered list", apply: (origin: ToolbarFocusOrigin) => editor.chain().command(focusFromToolbar(origin)).toggleOrderedList().run() },
    { value: "taskList", label: "Task list", apply: (origin: ToolbarFocusOrigin) => editor.chain().command(focusFromToolbar(origin)).toggleTaskList().run() },
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
          "flex items-center bg-card/95",
          compact
            ? "h-[52px] flex-nowrap gap-0.5 overflow-x-auto overscroll-x-contain touch-pan-x select-none scrollbar-none px-1 [&>button]:h-11 [&>button]:min-w-11 [&>button]:shrink-0"
            : "sticky top-[var(--note-editor-header-h)] z-20 flex-wrap gap-1.5 border-b border-border/40 backdrop-blur-md p-2"
        )}
      >

        {!compact && historyControls}

        {compact && (
          <EditorToolbarMenu
            label="Text style"
            onOpen={cancelPendingFocus}
            value={textStyle}
            options={[
              { value: "paragraph", label: "Paragraph", apply: (origin) => editor.chain().command(focusFromToolbar(origin)).setParagraph().run() },
              ...([1, 2, 3] as const).map(level => ({
                value: `h${level}`, label: `Heading ${level}`,
                apply: (origin: ToolbarFocusOrigin) => editor.chain().command(focusFromToolbar(origin)).setHeading({ level }).run(),
              })),
            ]}
          >
            <span className="text-xs font-semibold">{heading ? `H${heading}` : "P"}</span>
          </EditorToolbarMenu>
        )}

        {compact ? (
          <EditorToolbarMenu
            label="Text formatting"
            onOpen={cancelPendingFocus}
            multiple
            options={[
              { value: "bold", label: "Bold", checked: editor.isActive("bold"), apply: (origin) => editor.chain().command(focusFromToolbar(origin)).toggleBold().run() },
              { value: "italic", label: "Italic", checked: editor.isActive("italic"), apply: (origin) => editor.chain().command(focusFromToolbar(origin)).toggleItalic().run() },
              { value: "underline", label: "Underline", checked: editor.isActive("underline"), apply: (origin) => editor.chain().command(focusFromToolbar(origin)).toggleUnderline().run() },
              { value: "strike", label: "Strikethrough", checked: editor.isActive("strike"), apply: (origin) => editor.chain().command(focusFromToolbar(origin)).toggleStrike().run() },
            ]}
          >
            <Bold className="h-4 w-4" />
          </EditorToolbarMenu>
        ) : (<>
        {/* Inline formatting */}
        <EditorToolbarButton dataCy="bold-button" label="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="italic-button" label="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="underline-button" label="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="strike-button" label="Strikethrough" active={editor.isActive("strike")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </EditorToolbarButton>
        </>)}
        {/* Mobile primary controls come first in DOM and keyboard order. */}
        {compact && (
          <EditorToolbarMenu
            label="Lists"
            onOpen={cancelPendingFocus}
            value={listType}
            options={[
              { value: "none", label: "No list", apply: (origin) => listOptions.find(option => option.value === listType)?.apply(origin) },
              ...listOptions,
            ]}
          >
            {listType === "taskList" ? <CheckSquare className="h-4 w-4" /> : listType === "orderedList" ? <ListOrdered className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </EditorToolbarMenu>
        )}
        {compact && (
          <EditorToolbarMenu
            label="Text alignment"
            onOpen={cancelPendingFocus}
            value={alignment}
            options={["left", "center", "right"].map(value => ({
              value, label: `Align ${value}`, apply: (origin: ToolbarFocusOrigin) => editor.chain().command(focusFromToolbar(origin)).setTextAlign(value).run(),
            }))}
          >
            {alignment === "center" ? <AlignCenter className="h-4 w-4" /> : alignment === "right" ? <AlignRight className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
          </EditorToolbarMenu>
        )}

        {compact && historyControls}

        <EditorToolbarButton dataCy="highlight-button" label="Highlight" active={editor.isActive("highlight")} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).toggleHighlight().run()}>
          <Highlighter className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Color picker — custom structure (PopoverTrigger inside Tooltip) */}
        <Popover open={colorMenuOpen} onOpenChange={next => {
          if (next) { cancelPendingFocus(); setPickerSeed(getPickerSeed(editor)) }
          setColorMenuOpen(next)
        }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button ref={colorButtonRef} data-cy="color-button" variant="ghost" size="sm" aria-label="Text color" onClick={cancelPendingFocus}>
                  <Palette className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Text color</TooltipContent>
          </Tooltip>
          <PopoverContent ref={colorContentRef} side={compact ? "top" : "bottom"} className="w-auto p-0">
            <TwitterPicker
              data-cy="color-picker"
              color={editor.getAttributes("textStyle").color || pickerSeed}
              onChange={(color: ColorResult, event) => {
                // The hex input emits a valid intermediate color after three
                // digits. Keep it focused while the user completes the value.
                const fromHexInput = event?.target instanceof HTMLInputElement && colorContentRef.current?.contains(event.target)
                // Mobile focus is synchronous: without cancelling this swatch
                // key, Enter can replace the editor's selection with a newline.
                if (!fromHexInput && event?.type === "keydown" && (event as React.KeyboardEvent<HTMLElement>).keyCode === 13) event.preventDefault()
                if (fromHexInput) cancelPendingFocus()
                const chain = fromHexInput ? editor.chain() : focusFromControl({ trigger: colorButtonRef.current, content: colorContentRef.current })
                chain.setColor(color.hex).run()
              }}
            />
          </PopoverContent>
        </Popover>

        {/* Font family */}
        <Select
          open={compact ? fontMenuOpen : undefined}
          onOpenChange={next => {
            if (next) { cancelPendingFocus(); fontAppliedRef.current = false; setFontTooltipOpen(false) }
            setFontMenuOpen(next)
          }}
          onValueChange={value => {
            fontAppliedRef.current = true
            focusFromControl({ trigger: fontButtonRef.current, content: fontContentRef.current }).setFontFamily(value).run()
          }}
          value={editor.getAttributes("textStyle").fontFamily || fontFamilies[0]}
        >
          <Tooltip open={fontTooltipOpen && !fontMenuOpen} onOpenChange={next => setFontTooltipOpen(next && !fontMenuOpen)}>
            <TooltipTrigger asChild>
              <SelectTrigger
                ref={fontButtonRef}
                data-cy="font-family-button"
                className={cn("text-xs h-8", compact ? "w-12 gap-1 px-2" : "w-[120px]")}
                aria-label="Font family"
                onPointerDown={compact ? event => event.preventDefault() : undefined}
                onClick={event => { cancelPendingFocus(); if (compact) { event.preventDefault(); fontAppliedRef.current = false; setFontTooltipOpen(false); setFontMenuOpen(true) } }}
              >
                {compact ? <span className="text-sm" aria-hidden="true">Aa</span> : <SelectValue placeholder="Font Family" />}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font family</TooltipContent>
          </Tooltip>
          <SelectContent ref={fontContentRef} side={compact ? "top" : "bottom"} onCloseAutoFocus={event => { if (fontAppliedRef.current) event.preventDefault() }}>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">{font}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font size */}
        <Select
          open={compact ? sizeMenuOpen : undefined}
          onOpenChange={next => {
            if (next) { cancelPendingFocus(); sizeAppliedRef.current = false; setSizeTooltipOpen(false) }
            setSizeMenuOpen(next)
          }}
          onValueChange={value => {
            sizeAppliedRef.current = true
            focusFromControl({ trigger: sizeButtonRef.current, content: sizeContentRef.current }).setFontSize(`${value}pt`).run()
          }}
          value={editor.getAttributes("textStyle").fontSize?.replace("pt", "") || fontSizes[2]}
        >
          <Tooltip open={sizeTooltipOpen && !sizeMenuOpen} onOpenChange={next => setSizeTooltipOpen(next && !sizeMenuOpen)}>
            <TooltipTrigger asChild>
              <SelectTrigger
                ref={sizeButtonRef}
                data-cy="font-size-button" className="w-[70px] text-xs h-8" aria-label="Font size"
                onPointerDown={compact ? event => event.preventDefault() : undefined}
                onClick={event => { cancelPendingFocus(); if (compact) { event.preventDefault(); sizeAppliedRef.current = false; setSizeTooltipOpen(false); setSizeMenuOpen(true) } }}
              >
                <SelectValue placeholder="Font Size" />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>Font size</TooltipContent>
          </Tooltip>
          <SelectContent ref={sizeContentRef} side={compact ? "top" : "bottom"} onCloseAutoFocus={event => { if (sizeAppliedRef.current) event.preventDefault() }}>
            {fontSizes.map((size) => (
              <SelectItem key={size} value={size} className="text-xs">{size} pt</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!compact && (<>
          {/* Headings & paragraph */}
          <EditorToolbarButton dataCy="h1-button" label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).setHeading({ level: 1 }).run()}>
            <Heading1 className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="h2-button" label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).setHeading({ level: 2 }).run()}>
            <Heading2 className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="h3-button" label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).setHeading({ level: 3 }).run()}>
            <Heading3 className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="paragraph-button" label="Paragraph" active={editor.isActive("paragraph")} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).setParagraph().run()}>
            P
          </EditorToolbarButton>
        </>)}
        <EditorToolbarButton dataCy="horizontal-rule-button" label="Horizontal rule" onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </EditorToolbarButton>

        {!compact && (<>
          {/* Lists */}
          <EditorToolbarButton dataCy="bullet-list-button" label="Bullet list" active={editor.isActive("bulletList")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleBulletList().run()}>
            <List className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="ordered-list-button" label="Numbered list" active={editor.isActive("orderedList")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleOrderedList().run()}>
            <ListOrdered className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="task-list-button" label="Task list" active={editor.isActive("taskList")} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).toggleTaskList().run()}>
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
        <Popover open={imageMenuOpen} onOpenChange={next => { if (next) cancelPendingFocus(); setImageMenuOpen(next) }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  ref={imageButtonRef}
                  type="button"
                  data-cy="image-button"
                  variant={editor.isActive("image") ? "secondary" : "ghost"}
                  aria-label="Image options"
                  onMouseDown={event => event.preventDefault()}
                  onClick={cancelPendingFocus}
                  className="h-8 w-8 p-0 rounded-lg active:scale-90 hover:bg-muted transition-all duration-100 ease-out shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Image options</TooltipContent>
          </Tooltip>
          <input ref={imageInputRef} data-cy="image-file-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={addImageFromFile} />
          <PopoverContent side={compact ? "top" : "bottom"} align="start" className="w-52 p-1" onCloseAutoFocus={event => {
            if (imageCommandAppliedRef.current) {
              event.preventDefault()
              imageCommandAppliedRef.current = false
            }
          }}>
            <Button type="button" variant="ghost" className="h-11 w-full justify-start" onClick={() => { setImageMenuOpen(false); imageInputRef.current?.click() }}>
              Choose from device
            </Button>
            <Button type="button" variant="ghost" className="h-11 w-full justify-start" onClick={addImage}>
              Insert from URL
            </Button>
            <Button type="button" variant="ghost" className="h-11 w-full justify-start" onClick={describeImage}>
              Image description
            </Button>
          </PopoverContent>
        </Popover>
        {imageDescriptionTarget && (
          <ImageDescriptionDialog
            editor={editor}
            target={imageDescriptionTarget}
            onClose={() => setImageDescriptionTarget(null)}
            onReturnFocus={() => imageButtonRef.current?.focus()}
          />
        )}

        {!compact && (<>
          {/* Alignment */}
          <EditorToolbarButton dataCy="align-left-button" label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).setTextAlign("left").run()}>
            <AlignLeft className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="align-center-button" label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).setTextAlign("center").run()}>
            <AlignCenter className="w-4 h-4" />
          </EditorToolbarButton>
          <EditorToolbarButton dataCy="align-right-button" label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={event => editor.chain().command(focusFromToolbar({ trigger: event.currentTarget, content: null })).setTextAlign("right").run()}>
            <AlignRight className="w-4 h-4" />
          </EditorToolbarButton>

          {/* Indent */}
        </>)}
        <EditorToolbarButton dataCy="indent-button" label="Indent" onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).sinkListItem("listItem").run()} disabled={!editor.can().sinkListItem("listItem")}>
          <Indent className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="outdent-button" label="Outdent" onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).liftListItem("listItem").run()} disabled={!editor.can().liftListItem("listItem")}>
          <Outdent className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Script */}
        <EditorToolbarButton dataCy="superscript-button" label="Superscript" active={editor.isActive("superscript")} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).toggleSuperscript().run()}>
          <SuperscriptIcon className="w-4 h-4" />
        </EditorToolbarButton>
        <EditorToolbarButton dataCy="subscript-button" label="Subscript" active={editor.isActive("subscript")} onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).toggleSubscript().run()}>
          <SubscriptIcon className="w-4 h-4" />
        </EditorToolbarButton>

        {/* Utilities */}
        <EditorToolbarButton dataCy="clear-formatting-button" label="Clear formatting" onClick={event => focusFromControl({ trigger: event.currentTarget, content: null }).unsetAllMarks().clearNodes().run()}>
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
