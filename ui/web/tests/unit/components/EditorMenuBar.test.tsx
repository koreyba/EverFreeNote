import * as React from "react"
import { render, fireEvent, waitFor } from "@testing-library/react"
import type { Editor } from "@tiptap/react"
import { EditorMenuBar } from "@ui/web/components/EditorMenuBar"
import { browser } from "@ui/web/adapters/browser"

// Polyfill JSDOM missing methods for Radix UI components
if (typeof window !== "undefined") {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = jest.fn()
  }
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = jest.fn()
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = jest.fn()
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = jest.fn()
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
}

type MockEditorOptions = {
  activeMarks?: Record<string, boolean>
  canSink?: boolean
  canLift?: boolean
  textColor?: string
}

function createMockEditor(options: MockEditorOptions = {}) {
  const runMock = jest.fn()

  const chainObj: Record<string, jest.Mock> = {}
  const chainMethods = [
    "focus",
    "toggleBold",
    "toggleItalic",
    "toggleUnderline",
    "toggleStrike",
    "toggleHighlight",
    "setColor",
    "setFontFamily",
    "setFontSize",
    "setHeading",
    "setParagraph",
    "setHorizontalRule",
    "toggleBulletList",
    "toggleOrderedList",
    "toggleTaskList",
    "setLink",
    "setImage",
    "setTextAlign",
    "sinkListItem",
    "liftListItem",
    "toggleSuperscript",
    "toggleSubscript",
    "unsetAllMarks",
    "clearNodes",
  ]

  chainMethods.forEach((method) => {
    chainObj[method] = jest.fn().mockImplementation(() => chainObj)
  })
  chainObj.run = runMock

  const isActiveMock = jest.fn((name: string | Record<string, unknown>, attributes?: Record<string, unknown>) => {
    if (typeof name === "object") {
      const key = Object.keys(name)[0]
      const val = name[key]
      return options.activeMarks?.[`${key}:${val}`] ?? false
    }
    if (attributes && typeof attributes === "object") {
      const key = Object.keys(attributes)[0]
      const val = attributes[key]
      return options.activeMarks?.[`${name}:${key}:${val}`] ?? false
    }
    return options.activeMarks?.[name] ?? false
  })

  const getAttributesMock = jest.fn((name: string) => {
    if (name === "textStyle") {
      return { color: options.textColor || "#000000" }
    }
    return {}
  })

  const canMock = jest.fn().mockReturnValue({
    sinkListItem: jest.fn().mockReturnValue(options.canSink ?? false),
    liftListItem: jest.fn().mockReturnValue(options.canLift ?? false),
  })

  const editor = {
    chain: jest.fn().mockReturnValue(chainObj),
    isActive: isActiveMock,
    getAttributes: getAttributesMock,
    can: canMock,
  }

  return {
    editor: editor as unknown as Editor,
    chainObj,
    runMock,
    isActiveMock,
    getAttributesMock,
    canMock,
  }
}

describe("EditorMenuBar", () => {
  const defaultProps = {
    historyState: { canUndo: true, canRedo: true },
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    hasSelection: true,
    onApplyMarkdown: jest.fn(),
    spellcheckEnabled: true,
    onToggleSpellcheck: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering & Null state", () => {
    it("renders null when editor is null", () => {
      const { container } = render(
        <EditorMenuBar editor={null} {...defaultProps} />
      )
      expect(container.firstChild).toBeNull()
    })

    it("renders toolbar buttons when editor is provided", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      expect(container.firstChild).not.toBeNull()
      expect(container.querySelector('[data-cy="undo-button"]')).not.toBeNull()
      expect(container.querySelector('[data-cy="redo-button"]')).not.toBeNull()
    })
  })

  describe("History actions", () => {
    it("disables undo button when historyState.canUndo is false", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar
          editor={editor}
          {...defaultProps}
          historyState={{ canUndo: false, canRedo: true }}
        />
      )
      const undoBtn = container.querySelector('[data-cy="undo-button"]') as HTMLButtonElement
      expect(undoBtn.disabled).toBe(true)
    })

    it("triggers onUndo when undo button is clicked", () => {
      const { editor } = createMockEditor()
      const onUndo = jest.fn()
      const { container } = render(
        <EditorMenuBar
          editor={editor}
          {...defaultProps}
          onUndo={onUndo}
          historyState={{ canUndo: true, canRedo: true }}
        />
      )
      const undoBtn = container.querySelector('[data-cy="undo-button"]') as HTMLButtonElement
      fireEvent.click(undoBtn)
      expect(onUndo).toHaveBeenCalledTimes(1)
    })

    it("disables redo button when historyState.canRedo is false", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar
          editor={editor}
          {...defaultProps}
          historyState={{ canUndo: true, canRedo: false }}
        />
      )
      const redoBtn = container.querySelector('[data-cy="redo-button"]') as HTMLButtonElement
      expect(redoBtn.disabled).toBe(true)
    })

    it("triggers onRedo when redo button is clicked", () => {
      const { editor } = createMockEditor()
      const onRedo = jest.fn()
      const { container } = render(
        <EditorMenuBar
          editor={editor}
          {...defaultProps}
          onRedo={onRedo}
          historyState={{ canUndo: true, canRedo: true }}
        />
      )
      const redoBtn = container.querySelector('[data-cy="redo-button"]') as HTMLButtonElement
      fireEvent.click(redoBtn)
      expect(onRedo).toHaveBeenCalledTimes(1)
    })
  })

  describe("Inline formatting commands", () => {
    it("triggers toggleBold command on bold button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="bold-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(editor.chain).toHaveBeenCalled()
      expect(chainObj.focus).toHaveBeenCalled()
      expect(chainObj.toggleBold).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleItalic command on italic button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="italic-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleItalic).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleUnderline command on underline button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="underline-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleUnderline).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleStrike command on strike button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="strike-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleStrike).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleHighlight command on highlight button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="highlight-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleHighlight).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("displays active formatting states", () => {
      const { editor } = createMockEditor({
        activeMarks: {
          bold: true,
          italic: true,
        },
      })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const boldBtn = container.querySelector('[data-cy="bold-button"]')
      const italicBtn = container.querySelector('[data-cy="italic-button"]')
      const underlineBtn = container.querySelector('[data-cy="underline-button"]')

      expect(boldBtn?.getAttribute("class")).toContain("bg-secondary")
      expect(italicBtn?.getAttribute("class")).toContain("bg-secondary")
      expect(underlineBtn?.getAttribute("class")).not.toContain("bg-secondary")
    })
  })

  describe("Headings & Paragraph formatting", () => {
    it("triggers setHeading level 1", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="h1-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setHeading).toHaveBeenCalledWith({ level: 1 })
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setHeading level 2", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="h2-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setHeading).toHaveBeenCalledWith({ level: 2 })
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setHeading level 3", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="h3-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setHeading).toHaveBeenCalledWith({ level: 3 })
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setParagraph", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="paragraph-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setParagraph).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setHorizontalRule", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="horizontal-rule-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setHorizontalRule).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("reflects active state for heading", () => {
      const { editor } = createMockEditor({
        activeMarks: {
          "heading:level:2": true,
        },
      })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const h2Btn = container.querySelector('[data-cy="h2-button"]')
      const h1Btn = container.querySelector('[data-cy="h1-button"]')
      expect(h2Btn?.getAttribute("class")).toContain("bg-secondary")
      expect(h1Btn?.getAttribute("class")).not.toContain("bg-secondary")
    })
  })

  describe("Lists", () => {
    it("triggers toggleBulletList", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="bullet-list-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleBulletList).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleOrderedList", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="ordered-list-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleOrderedList).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleTaskList", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="task-list-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleTaskList).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })
  })

  describe("Insert Link & Image", () => {
    it("prompts for link URL and sets link when URL is provided", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      jest.spyOn(browser, "prompt").mockReturnValue("https://example.com")
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="link-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(browser.prompt).toHaveBeenCalledWith("URL")
      expect(chainObj.setLink).toHaveBeenCalledWith({ href: "https://example.com" })
      expect(runMock).toHaveBeenCalled()
    })

    it("does not set link when prompt returns null or empty string", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      jest.spyOn(browser, "prompt").mockReturnValue(null)
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="link-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(browser.prompt).toHaveBeenCalledWith("URL")
      expect(chainObj.setLink).not.toHaveBeenCalled()
      expect(runMock).not.toHaveBeenCalled()
    })

    it("prompts for image URL and sets image when URL is provided", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      jest.spyOn(browser, "prompt").mockReturnValue("https://example.com/test.png")
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="image-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(browser.prompt).toHaveBeenCalledWith("Image URL:")
      expect(chainObj.setImage).toHaveBeenCalledWith({ src: "https://example.com/test.png" })
      expect(runMock).toHaveBeenCalled()
    })

    it("does not set image when prompt is cancelled", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      jest.spyOn(browser, "prompt").mockReturnValue(null)
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="image-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(browser.prompt).toHaveBeenCalledWith("Image URL:")
      expect(chainObj.setImage).not.toHaveBeenCalled()
      expect(runMock).not.toHaveBeenCalled()
    })
  })

  describe("Alignment", () => {
    it("triggers setTextAlign left", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="align-left-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setTextAlign).toHaveBeenCalledWith("left")
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setTextAlign center", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="align-center-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setTextAlign).toHaveBeenCalledWith("center")
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers setTextAlign right", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="align-right-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.setTextAlign).toHaveBeenCalledWith("right")
      expect(runMock).toHaveBeenCalled()
    })
  })

  describe("Indent & Outdent", () => {
    it("disables indent button when sinkListItem is false", () => {
      const { editor } = createMockEditor({ canSink: false })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="indent-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    it("triggers sinkListItem when indent button is clicked and enabled", () => {
      const { editor, chainObj, runMock } = createMockEditor({ canSink: true })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="indent-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(false)
      fireEvent.click(btn)
      expect(chainObj.sinkListItem).toHaveBeenCalledWith("listItem")
      expect(runMock).toHaveBeenCalled()
    })

    it("disables outdent button when liftListItem is false", () => {
      const { editor } = createMockEditor({ canLift: false })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="outdent-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    it("triggers liftListItem when outdent button is clicked and enabled", () => {
      const { editor, chainObj, runMock } = createMockEditor({ canLift: true })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="outdent-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(false)
      fireEvent.click(btn)
      expect(chainObj.liftListItem).toHaveBeenCalledWith("listItem")
      expect(runMock).toHaveBeenCalled()
    })
  })

  describe("Superscript & Subscript", () => {
    it("triggers toggleSuperscript", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="superscript-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleSuperscript).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("triggers toggleSubscript", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="subscript-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.toggleSubscript).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })
  })

  describe("Utilities", () => {
    it("clears formatting on clear formatting button click", () => {
      const { editor, chainObj, runMock } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const btn = container.querySelector('[data-cy="clear-formatting-button"]') as HTMLButtonElement
      fireEvent.click(btn)
      expect(chainObj.unsetAllMarks).toHaveBeenCalled()
      expect(chainObj.clearNodes).toHaveBeenCalled()
      expect(runMock).toHaveBeenCalled()
    })

    it("disables apply markdown button when hasSelection is false", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} hasSelection={false} />
      )
      const btn = container.querySelector('[data-cy="apply-markdown-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
    })

    it("enables apply markdown button when hasSelection is true and triggers onApplyMarkdown on click", () => {
      const { editor } = createMockEditor()
      const onApplyMarkdown = jest.fn()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} hasSelection={true} onApplyMarkdown={onApplyMarkdown} />
      )
      const btn = container.querySelector('[data-cy="apply-markdown-button"]') as HTMLButtonElement
      expect(btn.disabled).toBe(false)
      fireEvent.click(btn)
      expect(onApplyMarkdown).toHaveBeenCalledTimes(1)
    })

    it("renders spellcheck button with active state when spellcheckEnabled is true", () => {
      const { editor } = createMockEditor()
      const onToggleSpellcheck = jest.fn()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} spellcheckEnabled={true} onToggleSpellcheck={onToggleSpellcheck} />
      )
      const btn = container.querySelector('[data-cy="toggle-spellcheck-button"]') as HTMLButtonElement
      expect(btn.getAttribute("aria-label")).toBe("Toggle Spellcheck")
      expect(btn.getAttribute("class")).toContain("bg-secondary")
      fireEvent.click(btn)
      expect(onToggleSpellcheck).toHaveBeenCalledTimes(1)
    })

    it("renders spellcheck button with inactive state when spellcheckEnabled is false", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} spellcheckEnabled={false} />
      )
      const btn = container.querySelector('[data-cy="toggle-spellcheck-button"]') as HTMLButtonElement
      expect(btn.getAttribute("class")).not.toContain("bg-secondary")
    })
  })

  describe("Color picker & Select dropdowns", () => {
    it("renders color picker button and opens popover on click", async () => {
      const { editor } = createMockEditor({ textColor: "#ff0000" })
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const colorBtn = container.querySelector('[data-cy="color-button"]') as HTMLButtonElement
      expect(colorBtn).not.toBeNull()
      fireEvent.click(colorBtn)
      // Popover should render TwitterPicker content
      await waitFor(() => {
        expect(document.querySelector(".twitter-picker")).not.toBeNull()
      })
    })

    it("renders font family and font size select triggers", () => {
      const { editor } = createMockEditor()
      const { container } = render(
        <EditorMenuBar editor={editor} {...defaultProps} />
      )
      const fontFamilyBtn = container.querySelector('[data-cy="font-family-button"]')
      const fontSizeBtn = container.querySelector('[data-cy="font-size-button"]')
      expect(fontFamilyBtn).not.toBeNull()
      expect(fontSizeBtn).not.toBeNull()
    })
  })
})
