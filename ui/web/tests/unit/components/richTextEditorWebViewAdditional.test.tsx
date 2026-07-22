import React from 'react'
import { act, render } from '@testing-library/react'
import RichTextEditorWebView from '@ui/web/components/RichTextEditorWebView'
import { SmartPasteService } from '@core/services/smartPaste'
import { placeCaretFromCoords } from '@core/utils/prosemirrorCaret'

type UseEditorConfig = Parameters<typeof import('@tiptap/react').useEditor>[0]

let capturedConfig: UseEditorConfig | null = null
let mockEditor: ReturnType<typeof createMockEditor> | null = null

jest.mock('@tiptap/react', () => ({
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-has-editor={String(Boolean(editor))} />
  ),
  useEditor: (config: UseEditorConfig) => {
    capturedConfig = config
    return mockEditor
  },
}))
jest.mock('@tiptap/core', () => ({ createDocument: jest.fn() }))
jest.mock('@ui/web/components/editorExtensions', () => ({ editorExtensions: [] }))
jest.mock('@ui/web/components/chunkFocusUtils', () => ({ scrollEditorToChunk: jest.fn() }))
jest.mock('@ui/web/components/executeEditorCommand', () => ({ executeEditorCommand: jest.fn() }))
jest.mock('@core/services/smartPaste', () => ({
  SmartPasteService: { buildPayload: jest.fn(), resolvePaste: jest.fn() },
}))
jest.mock('@core/utils/prosemirrorCaret', () => ({ placeCaretFromCoords: jest.fn() }))
jest.mock('@ui/web/lib/editor', () => ({ applySelectionAsMarkdown: jest.fn() }))

function createMockEditor() {
  const chain = {
    focus: jest.fn().mockReturnThis(),
    insertContent: jest.fn().mockReturnThis(),
    run: jest.fn(),
  }
  return {
    view: { dom: document.createElement('div') },
    state: { selection: { empty: false, from: 2, to: 5 } },
    chain: jest.fn(() => chain),
    commands: { focus: jest.fn() },
    can: jest.fn(() => ({ undo: () => true, redo: () => false })),
    __chain: chain,
  }
}

function clipboardEvent(values: { html?: string; text?: string }) {
  return {
    clipboardData: {
      getData: jest.fn((type: string) => type === 'text/html' ? values.html ?? '' : values.text ?? ''),
    },
    preventDefault: jest.fn(),
  } as unknown as ClipboardEvent
}

describe('RichTextEditorWebView additional observable behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedConfig = null
    mockEditor = null
    jest.mocked(SmartPasteService.buildPayload).mockReturnValue({ html: '<p>source</p>', text: 'source' })
    jest.mocked(SmartPasteService.resolvePaste).mockReturnValue({ html: '<p>resolved</p>', text: 'resolved' })
    jest.mocked(placeCaretFromCoords).mockReturnValue({ handled: true })
  })

  it('handles external paste and suppresses only the following editor update', () => {
    mockEditor = createMockEditor()
    const onContentChange = jest.fn()
    render(<RichTextEditorWebView initialContent="<p>Initial</p>" onContentChange={onContentChange} />)

    const event = clipboardEvent({ html: '<p>source</p>', text: 'source' })
    expect(capturedConfig?.editorProps?.handlePaste?.(null, event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(mockEditor.__chain.insertContent).toHaveBeenCalledWith('<p>resolved</p>')
    expect(onContentChange).toHaveBeenCalledTimes(1)

    act(() => capturedConfig?.onUpdate?.({ editor: mockEditor } as never))
    expect(onContentChange).toHaveBeenCalledTimes(1)
    act(() => capturedConfig?.onUpdate?.({ editor: mockEditor } as never))
    expect(onContentChange).toHaveBeenCalledTimes(2)
  })

  it('returns false for missing editors, empty payloads, and content-node clicks', () => {
    const noEditorChange = jest.fn()
    const { unmount } = render(<RichTextEditorWebView initialContent="<p>Initial</p>" onContentChange={noEditorChange} />)
    const noEditorEvent = clipboardEvent({ text: 'ignored' })
    expect(capturedConfig?.editorProps?.handlePaste?.(null, noEditorEvent)).toBe(false)
    expect(noEditorEvent.preventDefault).not.toHaveBeenCalled()
    unmount()

    mockEditor = createMockEditor()
    jest.mocked(SmartPasteService.buildPayload).mockReturnValueOnce({ html: '', text: '' })
    const emptyEvent = clipboardEvent({ text: 'ignored' })
    expect(capturedConfig?.editorProps?.handlePaste?.(null, emptyEvent)).toBe(false)

    render(<RichTextEditorWebView initialContent="<p>Initial</p>" />)
    const contentNode = document.createElement('span')
    mockEditor.view.dom.appendChild(contentNode)
    const contentClick = { target: contentNode, clientX: 4, clientY: 8 } as unknown as MouseEvent
    expect(capturedConfig?.editorProps?.handleClick?.(mockEditor.view, 0, contentClick)).toBe(false)
    expect(placeCaretFromCoords).not.toHaveBeenCalled()
  })

  it('uses coordinate caret placement only for the editor background and returns its result', () => {
    mockEditor = createMockEditor()
    render(<RichTextEditorWebView initialContent="<p>Initial</p>" />)
    const backgroundClick = { target: mockEditor.view.dom, clientX: 12, clientY: 20 } as unknown as MouseEvent

    expect(capturedConfig?.editorProps?.handleClick?.(mockEditor.view, 0, backgroundClick)).toBe(true)
    expect(placeCaretFromCoords).toHaveBeenCalledWith(mockEditor.view, 12, 20)
  })

  it('forwards editor lifecycle signals to the host', () => {
    mockEditor = createMockEditor()
    const callbacks = {
      onFocus: jest.fn(),
      onBlur: jest.fn(),
      onSelectionChange: jest.fn(),
      onHistoryStateChange: jest.fn(),
    }
    render(<RichTextEditorWebView initialContent="<p>Initial</p>" {...callbacks} />)

    act(() => capturedConfig?.onCreate?.({ editor: mockEditor } as never))
    act(() => capturedConfig?.onTransaction?.({ editor: mockEditor } as never))
    act(() => capturedConfig?.onSelectionUpdate?.({ editor: mockEditor } as never))
    act(() => capturedConfig?.onFocus?.())
    act(() => capturedConfig?.onBlur?.())

    expect(callbacks.onHistoryStateChange).toHaveBeenCalledWith({ canUndo: true, canRedo: false })
    expect(callbacks.onSelectionChange).toHaveBeenCalledWith(true)
    expect(callbacks.onFocus).toHaveBeenCalledTimes(1)
    expect(callbacks.onBlur).toHaveBeenCalledTimes(1)
  })
})
