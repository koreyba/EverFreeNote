import React from 'react'
import { act, render } from '@testing-library/react'
import RichTextEditor from '@ui/web/components/RichTextEditor'
import { SmartPasteService } from '@core/services/smartPaste'
import { NoteClipboardService } from '@core/services/noteClipboard'
import { applySelectionAsMarkdown } from '@ui/web/lib/editor'
import { placeCaretFromCoords } from '@core/utils/prosemirrorCaret'
import { scrollEditorToChunk } from '@ui/web/components/chunkFocusUtils'
import { executeEditorCommand } from '@ui/web/components/executeEditorCommand'
import type { EditorMenuBarProps } from '@ui/web/components/EditorMenuBar'

type UseEditorConfig = Parameters<typeof import('@tiptap/react').useEditor>[0]

let capturedConfig: UseEditorConfig | null = null
let capturedMenuBarProps: EditorMenuBarProps | null = null
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
jest.mock('@ui/web/components/EditorMenuBar', () => ({
  EditorMenuBar: (props: EditorMenuBarProps) => {
    capturedMenuBarProps = props
    return <div data-testid="mock-menu-bar" />
  },
}))
jest.mock('@ui/web/components/editorExtensions', () => ({ editorExtensions: [] }))
jest.mock('@ui/web/components/chunkFocusUtils', () => ({ scrollEditorToChunk: jest.fn() }))
jest.mock('@ui/web/components/executeEditorCommand', () => ({ executeEditorCommand: jest.fn() }))
jest.mock('@core/services/smartPaste', () => ({
  SmartPasteService: { buildPayload: jest.fn(), resolvePaste: jest.fn() },
}))
jest.mock('@core/services/noteClipboard', () => ({
  NoteClipboardService: { buildPayload: jest.fn() },
}))
jest.mock('@core/utils/prosemirrorCaret', () => ({ placeCaretFromCoords: jest.fn() }))
jest.mock('@ui/web/lib/editor', () => ({ applySelectionAsMarkdown: jest.fn() }))

function createMockEditor() {
  const chain = {
    focus: jest.fn().mockReturnThis(),
    insertContent: jest.fn().mockReturnThis(),
    run: jest.fn(),
  }
  const tr = {
    replaceWith: jest.fn().mockReturnThis(),
    setMeta: jest.fn().mockReturnThis(),
  }
  const editor = {
    getHTML: jest.fn(() => '<p>Current</p>'),
    schema: { nodes: {} },
    options: { parseOptions: {}, enableContentCheck: false },
    state: {
      doc: { content: { size: 9 } },
      tr,
      selection: { empty: false, from: 2, to: 5, content: jest.fn(() => 'slice') },
    },
    view: {
      dom: document.createElement('div'),
      dispatch: jest.fn(),
      serializeForClipboard: jest.fn(() => ({ dom: { innerHTML: '<p>Selected</p>' } })),
    },
    commands: { undo: jest.fn(), redo: jest.fn() },
    chain: jest.fn(() => chain),
    can: jest.fn(() => ({ undo: () => true, redo: () => false })),
    __chain: chain,
    __tr: tr,
  }
  return editor
}

function clipboardEvent(values: { html?: string; text?: string }) {
  return {
    clipboardData: {
      getData: jest.fn((type: string) => type === 'text/html' ? values.html ?? '' : values.text ?? ''),
      setData: jest.fn(),
    },
    preventDefault: jest.fn(),
  } as unknown as ClipboardEvent
}

describe('RichTextEditor additional observable behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedConfig = null
    capturedMenuBarProps = null
    mockEditor = null
    localStorage.clear()
    jest.mocked(SmartPasteService.buildPayload).mockReturnValue({ html: '<p>source</p>', text: 'source' })
    jest.mocked(SmartPasteService.resolvePaste).mockReturnValue({ html: '<p>resolved</p>', text: 'resolved' })
    jest.mocked(NoteClipboardService.buildPayload).mockReturnValue({ html: '<p>marked</p>', text: 'Selected' })
    jest.mocked(scrollEditorToChunk).mockReturnValue(true)
    jest.mocked(placeCaretFromCoords).mockReturnValue({ handled: true })
  })

  it('handles external paste, suppresses the duplicate update, then allows the next update', () => {
    mockEditor = createMockEditor()
    const onContentChange = jest.fn()
    render(<RichTextEditor initialContent="<p>Initial</p>" onContentChange={onContentChange} />)

    const event = clipboardEvent({ html: '<p>source</p>', text: 'source' })
    const handled = capturedConfig?.editorProps?.handlePaste?.(null, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(SmartPasteService.resolvePaste).toHaveBeenCalledWith({ html: '<p>source</p>', text: 'source' })
    expect(mockEditor.__chain.focus).toHaveBeenCalled()
    expect(mockEditor.__chain.insertContent).toHaveBeenCalledWith('<p>resolved</p>')
    expect(onContentChange).toHaveBeenCalledTimes(1)

    act(() => capturedConfig?.onUpdate?.({ editor: mockEditor } as never))
    expect(onContentChange).toHaveBeenCalledTimes(1)
    act(() => capturedConfig?.onUpdate?.({ editor: mockEditor } as never))
    expect(onContentChange).toHaveBeenCalledTimes(2)
  })

  it('leaves ProseMirror-owned paste and empty payloads untouched', () => {
    mockEditor = createMockEditor()
    const onContentChange = jest.fn()
    render(<RichTextEditor initialContent="<p>Initial</p>" onContentChange={onContentChange} />)

    const internal = clipboardEvent({ html: '<p data-pm-slice="1 1 []">internal</p>' })
    expect(capturedConfig?.editorProps?.handlePaste?.(null, internal)).toBe(false)
    expect(internal.preventDefault).not.toHaveBeenCalled()
    expect(SmartPasteService.buildPayload).not.toHaveBeenCalled()

    jest.mocked(SmartPasteService.buildPayload).mockReturnValueOnce({ html: '', text: '' })
    const empty = clipboardEvent({ text: 'ignored' })
    expect(capturedConfig?.editorProps?.handlePaste?.(null, empty)).toBe(false)
    expect(empty.preventDefault).not.toHaveBeenCalled()
    expect(onContentChange).not.toHaveBeenCalled()
  })

  it('serializes a non-empty selection to the EverFreeNote clipboard contract', () => {
    mockEditor = createMockEditor()
    render(<RichTextEditor initialContent="<p>Initial</p>" />)

    const event = clipboardEvent({})
    const view = { ...mockEditor.view, state: mockEditor.state } as never
    const handled = capturedConfig?.editorProps?.handleDOMEvents?.copy?.(view, event)

    expect(handled).toBe(true)
    expect(NoteClipboardService.buildPayload).toHaveBeenCalledWith('<p>Selected</p>')
    expect(event.clipboardData?.setData).toHaveBeenNthCalledWith(1, 'text/html', '<p>marked</p>')
    expect(event.clipboardData?.setData).toHaveBeenNthCalledWith(2, 'text/plain', 'Selected')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('does not intercept an empty selection or an unrenderable clipboard payload', () => {
    mockEditor = createMockEditor()
    render(<RichTextEditor initialContent="<p>Initial</p>" />)
    const view = { ...mockEditor.view, state: mockEditor.state }
    const event = clipboardEvent({})

    view.state.selection.empty = true
    expect(capturedConfig?.editorProps?.handleDOMEvents?.copy?.(view as never, event)).toBe(false)

    view.state.selection.empty = false
    jest.mocked(NoteClipboardService.buildPayload).mockReturnValueOnce({ html: '', text: '' })
    expect(capturedConfig?.editorProps?.handleDOMEvents?.copy?.(view as never, event)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('applies a chunk-focus request once per request id and reports it', () => {
    mockEditor = createMockEditor()
    const onChunkFocusApplied = jest.fn()
    render(
      <RichTextEditor
        initialContent="<p>Initial</p>"
        chunkFocusRequest={{ requestId: 'request-1', charOffset: 4, chunkLength: 3 }}
        onChunkFocusApplied={onChunkFocusApplied}
      />,
    )

    expect(scrollEditorToChunk).toHaveBeenCalledWith(mockEditor, 4, 3)
    expect(onChunkFocusApplied).toHaveBeenCalledWith('request-1')

    act(() => capturedConfig?.onCreate?.({ editor: mockEditor } as never))
    expect(scrollEditorToChunk).toHaveBeenCalledTimes(1)
    expect(onChunkFocusApplied).toHaveBeenCalledTimes(1)
  })

  it('exposes the editor methods and forwards selection markdown and history callbacks', () => {
    mockEditor = createMockEditor()
    const ref = React.createRef<React.ElementRef<typeof RichTextEditor>>()
    const onContentChange = jest.fn()
    render(<RichTextEditor ref={ref} initialContent="<p>Initial</p>" onContentChange={onContentChange} />)

    expect(ref.current?.getHTML()).toBe('<p>Current</p>')
    ref.current?.runCommand('applyMarkdown', 'extra')
    expect(executeEditorCommand).toHaveBeenCalledWith(expect.objectContaining({
      editor: mockEditor,
      command: 'applyMarkdown',
      args: ['extra'],
      onApplySelectionAsMarkdown: expect.any(Function),
    }))
    ref.current?.scrollToChunk(7, 2)
    expect(scrollEditorToChunk).toHaveBeenCalledWith(mockEditor, 7, 2)

    act(() => capturedConfig?.onSelectionUpdate?.({ editor: mockEditor } as never))
    expect(capturedMenuBarProps?.hasSelection).toBe(true)
    act(() => capturedConfig?.onTransaction?.({ editor: mockEditor } as never))
    expect(capturedMenuBarProps?.historyState).toEqual({ canUndo: true, canRedo: false })

    capturedMenuBarProps?.onApplyMarkdown()
    expect(applySelectionAsMarkdown).toHaveBeenCalledWith(mockEditor, onContentChange)
  })
})
