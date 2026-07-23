import type { Editor } from "@tiptap/react"
import { executeEditorCommand } from "@ui/web/components/executeEditorCommand"

type MockChain = Record<string, unknown> & {
  focus: jest.Mock
  unsetAllMarks: jest.Mock
  clearNodes: jest.Mock
  extendMarkRange: jest.Mock
  setLink: jest.Mock
  unsetLink: jest.Mock
  setImage: jest.Mock
  toggleHeading: jest.Mock
  run: jest.Mock
}

function createMockEditor() {
  const chain: MockChain = {
    focus: jest.fn(),
    unsetAllMarks: jest.fn(),
    clearNodes: jest.fn(),
    extendMarkRange: jest.fn(),
    setLink: jest.fn(),
    unsetLink: jest.fn(),
    setImage: jest.fn(),
    toggleHeading: jest.fn(),
    run: jest.fn(),
  }

  chain.focus.mockReturnValue(chain)
  chain.unsetAllMarks.mockReturnValue(chain)
  chain.clearNodes.mockReturnValue(chain)
  chain.extendMarkRange.mockReturnValue(chain)
  chain.setLink.mockReturnValue(chain)
  chain.unsetLink.mockReturnValue(chain)
  chain.setImage.mockReturnValue(chain)
  chain.toggleHeading.mockReturnValue(chain)

  const undoMock = jest.fn()
  const redoMock = jest.fn()

  const editor = {
    commands: {
      undo: undoMock,
      redo: redoMock,
    },
    chain: jest.fn().mockReturnValue(chain),
  }

  return {
    editor: editor as unknown as Editor,
    chain,
    undoMock,
    redoMock,
  }
}

describe("executeEditorCommand", () => {
  let onApplySelectionAsMarkdown: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    onApplySelectionAsMarkdown = jest.fn()
  })

  describe("undo & redo commands", () => {
    it("executes undo command via editor.commands.undo()", () => {
      const { editor, undoMock, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "undo",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(undoMock).toHaveBeenCalledTimes(1)
      expect(onApplySelectionAsMarkdown).not.toHaveBeenCalled()
      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("executes redo command via editor.commands.redo()", () => {
      const { editor, redoMock, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "redo",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(redoMock).toHaveBeenCalledTimes(1)
      expect(onApplySelectionAsMarkdown).not.toHaveBeenCalled()
      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })
  })

  describe("applySelectionAsMarkdown command", () => {
    it("calls onApplySelectionAsMarkdown callback and does not touch editor chain or commands", () => {
      const { editor, undoMock, redoMock, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "applySelectionAsMarkdown",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(onApplySelectionAsMarkdown).toHaveBeenCalledTimes(1)
      expect(undoMock).not.toHaveBeenCalled()
      expect(redoMock).not.toHaveBeenCalled()
      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })
  })

  describe("clearFormatting command", () => {
    it("chains focus -> unsetAllMarks -> clearNodes -> run", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "clearFormatting",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.unsetAllMarks).toHaveBeenCalledTimes(1)
      expect(chain.clearNodes).toHaveBeenCalledTimes(1)
      expect(chain.run).toHaveBeenCalledTimes(1)
      expect(onApplySelectionAsMarkdown).not.toHaveBeenCalled()
    })
  })

  describe("setLinkUrl command", () => {
    it("sets link URL when a non-empty string argument is passed (trimming whitespace)", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "setLinkUrl",
        args: ["  https://example.com/test  "],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.extendMarkRange).toHaveBeenCalledWith("link")
      expect(chain.setLink).toHaveBeenCalledWith({ href: "https://example.com/test" })
      expect(chain.unsetLink).not.toHaveBeenCalled()
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("unsets link when an empty string argument is passed", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "setLinkUrl",
        args: ["  "],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.extendMarkRange).toHaveBeenCalledWith("link")
      expect(chain.unsetLink).toHaveBeenCalledTimes(1)
      expect(chain.setLink).not.toHaveBeenCalled()
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("ignores command when non-string argument is provided", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "setLinkUrl",
        args: [12345],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("ignores command when argument list is empty", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "setLinkUrl",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })
  })

  describe("insertImageUrl command", () => {
    it("inserts image when a valid non-empty string URL argument is passed (trimming whitespace)", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "insertImageUrl",
        args: ["  https://example.com/image.png  "],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.setImage).toHaveBeenCalledWith({ src: "https://example.com/image.png" })
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("does nothing when an empty string URL is passed", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "insertImageUrl",
        args: ["   "],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.setImage).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("does nothing when first arg is not a string", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "insertImageUrl",
        args: [null],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.setImage).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("does nothing when args is empty", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "insertImageUrl",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.setImage).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })
  })

  describe("toggleHeadingLevel command", () => {
    it.each([1, 2, 3])("toggles heading level %i when passed as a number", (level) => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "toggleHeadingLevel",
        args: [level],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.toggleHeading).toHaveBeenCalledWith({ level })
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("toggles heading level when passed as a numeric string", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "toggleHeadingLevel",
        args: ["2"],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.focus).toHaveBeenCalledTimes(1)
      expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 })
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it.each([0, 4, 5, -1])("ignores invalid heading level %i", (invalidLevel) => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "toggleHeadingLevel",
        args: [invalidLevel],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.toggleHeading).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("ignores non-numeric or empty arguments for heading level", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "toggleHeadingLevel",
        args: ["invalid"],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).not.toHaveBeenCalled()
      expect(chain.toggleHeading).not.toHaveBeenCalled()
      expect(chain.run).not.toHaveBeenCalled()
    })
  })

  describe("dynamic editor commands (formatting, lists, alignment, custom commands)", () => {
    it.each([
      "toggleBold",
      "toggleItalic",
      "toggleStrike",
      "toggleCode",
      "toggleBlockquote",
      "toggleBulletList",
      "toggleOrderedList",
      "toggleTaskList",
    ])("executes dynamic command '%s' with no arguments", (cmdName) => {
      const { editor, chain } = createMockEditor()
      const commandMock = jest.fn().mockReturnValue(chain)
      chain[cmdName] = commandMock

      executeEditorCommand({
        editor,
        command: cmdName,
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(commandMock).toHaveBeenCalledTimes(1)
      expect(commandMock).toHaveBeenCalledWith()
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("executes dynamic command with arguments (e.g. setTextAlign)", () => {
      const { editor, chain } = createMockEditor()
      const setTextAlignMock = jest.fn().mockReturnValue(chain)
      chain.setTextAlign = setTextAlignMock

      executeEditorCommand({
        editor,
        command: "setTextAlign",
        args: ["center"],
        onApplySelectionAsMarkdown,
      })

      expect(setTextAlignMock).toHaveBeenCalledTimes(1)
      expect(setTextAlignMock).toHaveBeenCalledWith("center")
      expect(chain.run).toHaveBeenCalledTimes(1)
    })

    it("does nothing if command is not a property on the editor chain", () => {
      const { editor, chain } = createMockEditor()

      executeEditorCommand({
        editor,
        command: "nonExistentCommand",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("does nothing if property on chain exists but is not a function", () => {
      const { editor, chain } = createMockEditor()
      chain.someStaticProperty = "not a function"

      executeEditorCommand({
        editor,
        command: "someStaticProperty",
        args: [],
        onApplySelectionAsMarkdown,
      })

      expect(editor.chain).toHaveBeenCalledTimes(1)
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("handles command function returning null without throwing", () => {
      const { editor, chain } = createMockEditor()
      chain.customCommand = jest.fn().mockReturnValue(null)

      expect(() => {
        executeEditorCommand({
          editor,
          command: "customCommand",
          args: [1, 2],
          onApplySelectionAsMarkdown,
        })
      }).not.toThrow()

      expect(chain.customCommand).toHaveBeenCalledWith(1, 2)
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("handles command function returning an object without a run method without throwing", () => {
      const { editor, chain } = createMockEditor()
      chain.customCommand = jest.fn().mockReturnValue({ result: "ok" })

      expect(() => {
        executeEditorCommand({
          editor,
          command: "customCommand",
          args: [],
          onApplySelectionAsMarkdown,
        })
      }).not.toThrow()

      expect(chain.customCommand).toHaveBeenCalledTimes(1)
      expect(chain.run).not.toHaveBeenCalled()
    })

    it("handles command function returning an object with a non-function run property", () => {
      const { editor, chain } = createMockEditor()
      chain.customCommand = jest.fn().mockReturnValue({ run: "invalid" })

      expect(() => {
        executeEditorCommand({
          editor,
          command: "customCommand",
          args: [],
          onApplySelectionAsMarkdown,
        })
      }).not.toThrow()

      expect(chain.customCommand).toHaveBeenCalledTimes(1)
      expect(chain.run).not.toHaveBeenCalled()
    })
  })
})
