import type { Editor } from "@tiptap/react"
import { SmartPasteService } from "@core/services/smartPaste"
import { applySelectionAsMarkdown } from "@ui/web/lib/editor"

function createMockEditor(from = 0, to = 10, selectedText = "# Heading 1") {
  const runMock = jest.fn()
  const insertContentMock = jest.fn().mockReturnValue({ run: runMock })
  const deleteRangeMock = jest.fn().mockReturnValue({ insertContent: insertContentMock })
  const focusMock = jest.fn().mockReturnValue({ deleteRange: deleteRangeMock })
  const chainMock = jest.fn().mockReturnValue({ focus: focusMock })

  const textBetweenMock = jest.fn().mockReturnValue(selectedText)

  const editor = {
    state: {
      selection: { from, to },
      doc: {
        textBetween: textBetweenMock,
      },
    },
    chain: chainMock,
  } as unknown as Editor

  return {
    editor,
    chainMock,
    focusMock,
    deleteRangeMock,
    insertContentMock,
    runMock,
    textBetweenMock,
  }
}

describe("applySelectionAsMarkdown", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does nothing when selection range is empty (from === to)", () => {
    const { editor, chainMock, textBetweenMock } = createMockEditor(5, 5)
    const onContentChange = jest.fn()
    const resolvePasteSpy = jest.spyOn(SmartPasteService, "resolvePaste")

    applySelectionAsMarkdown(editor, onContentChange)

    expect(textBetweenMock).not.toHaveBeenCalled()
    expect(resolvePasteSpy).not.toHaveBeenCalled()
    expect(chainMock).not.toHaveBeenCalled()
    expect(onContentChange).not.toHaveBeenCalled()
  })

  it("converts selected markdown text to HTML, replaces selection, and triggers onContentChange", () => {
    const {
      editor,
      chainMock,
      focusMock,
      deleteRangeMock,
      insertContentMock,
      runMock,
      textBetweenMock,
    } = createMockEditor(0, 14, "**Bold Text**")
    const onContentChange = jest.fn()

    applySelectionAsMarkdown(editor, onContentChange)

    expect(textBetweenMock).toHaveBeenCalledWith(0, 14, "\n\n")
    expect(chainMock).toHaveBeenCalledTimes(1)
    expect(focusMock).toHaveBeenCalledTimes(1)
    expect(deleteRangeMock).toHaveBeenCalledWith({ from: 0, to: 14 })
    expect(insertContentMock).toHaveBeenCalledWith("<p><strong>Bold Text</strong></p>\n")
    expect(runMock).toHaveBeenCalledTimes(1)
    expect(onContentChange).toHaveBeenCalledTimes(1)
  })

  it("works safely when onContentChange callback is omitted", () => {
    const { editor, runMock, insertContentMock } = createMockEditor(0, 10, "*Italic Text*")

    expect(() => applySelectionAsMarkdown(editor)).not.toThrow()
    expect(insertContentMock).toHaveBeenCalledWith("<p><em>Italic Text</em></p>\n")
    expect(runMock).toHaveBeenCalledTimes(1)
  })

  it("bails out when SmartPasteService returns empty HTML result", () => {
    const { editor, chainMock } = createMockEditor(0, 5, "plain text")
    const onContentChange = jest.fn()

    jest.spyOn(SmartPasteService, "resolvePaste").mockReturnValueOnce({
      html: "",
      type: "markdown",
      warnings: [],
      detection: { type: "markdown", confidence: 1, reasons: [], warnings: [] },
    })

    applySelectionAsMarkdown(editor, onContentChange)

    expect(chainMock).not.toHaveBeenCalled()
    expect(onContentChange).not.toHaveBeenCalled()
  })
})
