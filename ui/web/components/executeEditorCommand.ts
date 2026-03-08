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

export const executeEditorCommand = ({
  editor,
  command,
  args,
  onApplySelectionAsMarkdown,
}: ExecuteEditorCommandParams) => {
  if (command === "undo") {
    editor.commands.undo()
    return
  }

  if (command === "redo") {
    editor.commands.redo()
    return
  }

  if (command === "applySelectionAsMarkdown") {
    onApplySelectionAsMarkdown()
    return
  }

  if (command === "clearFormatting") {
    editor.chain().focus().unsetAllMarks().clearNodes().run()
    return
  }

  if (command === "setLinkUrl") {
    if (typeof args[0] !== "string") {
      return
    }
    const url = args[0].trim()
    const chain = editor.chain().focus().extendMarkRange("link")
    if (url) {
      chain.setLink({ href: url }).run()
    } else {
      chain.unsetLink().run()
    }
    return
  }

  if (command === "insertImageUrl") {
    const url = typeof args[0] === "string" ? args[0].trim() : ""
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
    return
  }

  if (command === "toggleHeadingLevel") {
    const level = Number(args[0])
    if ([1, 2, 3].includes(level)) {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
    }
    return
  }

  const cmd = (
    editor.chain().focus() as unknown as Record<
      string,
      (...a: unknown[]) => { run: () => void }
    >
  )[command]

  if (typeof cmd === "function") {
    cmd(...args).run()
  }
}
