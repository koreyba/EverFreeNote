import type { Editor } from "@tiptap/react"

export type EditorCommand =
  | "undo"
  | "redo"
  | "applySelectionAsMarkdown"
  | "clearFormatting"
  | "setLinkUrl"
  | "insertImageUrl"
  | "toggleHeadingLevel"
  | string

type ExecuteEditorCommandParams = {
  editor: Editor
  command: EditorCommand
  args: unknown[]
  onApplySelectionAsMarkdown: () => void
}

const handleSetLinkUrl = (editor: Editor, args: unknown[]) => {
  if (typeof args[0] !== "string") return
  const url = args[0].trim()
  const chain = editor.chain().focus().extendMarkRange("link")
  if (url) {
    chain.setLink({ href: url }).run()
  } else {
    chain.unsetLink().run()
  }
}

const handleInsertImageUrl = (editor: Editor, args: unknown[]) => {
  const url = typeof args[0] === "string" ? args[0].trim() : ""
  if (url) {
    editor.chain().focus().setImage({ src: url }).run()
  }
}

const handleToggleHeadingLevel = (editor: Editor, args: unknown[]) => {
  const level = Number(args[0])
  if ([1, 2, 3].includes(level)) {
    editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
  }
}

const handleDynamicCommand = (editor: Editor, command: string, args: unknown[]) => {
  const chain = editor.chain().focus() as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(chain, command)) return

  const candidate = chain[command]
  if (typeof candidate !== "function") return

  const next = (candidate as (...a: unknown[]) => unknown).apply(chain, args)
  if (
    typeof next === "object" &&
    next !== null &&
    typeof (next as { run?: unknown }).run === "function"
  ) {
    ;(next as { run: () => void }).run()
  }
}

export const executeEditorCommand = ({
  editor,
  command,
  args,
  onApplySelectionAsMarkdown,
}: ExecuteEditorCommandParams) => {
  switch (command) {
    case "undo":
      editor.commands.undo()
      break
    case "redo":
      editor.commands.redo()
      break
    case "applySelectionAsMarkdown":
      onApplySelectionAsMarkdown()
      break
    case "clearFormatting":
      editor.chain().focus().unsetAllMarks().clearNodes().run()
      break
    case "setLinkUrl":
      handleSetLinkUrl(editor, args)
      break
    case "insertImageUrl":
      handleInsertImageUrl(editor, args)
      break
    case "toggleHeadingLevel":
      handleToggleHeadingLevel(editor, args)
      break
    default:
      handleDynamicCommand(editor, command, args)
      break
  }
}
