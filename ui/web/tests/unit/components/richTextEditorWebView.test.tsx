import React from 'react'
import { render } from '@testing-library/react'
import RichTextEditorWebView from '@ui/web/components/RichTextEditorWebView'

const mockScrollEditorToChunk = jest.fn()
const mockExecuteEditorCommand = jest.fn()
const mockCreateDocument = jest.fn<string, [string, unknown, unknown, unknown]>(() => 'parsed-document')

type UseEditorConfig = Parameters<typeof import('@tiptap/react').useEditor>[0]

let capturedConfig: UseEditorConfig | null = null
let mockEditor: Record<string, unknown> | null = null

jest.mock('@tiptap/react', () => {
  return {
    EditorContent: ({ editor }: { editor: unknown }) => (
      <div data-testid="editor-content" data-has-editor={String(Boolean(editor))} />
    ),
    useEditor: (config: UseEditorConfig) => {
      capturedConfig = config
      return mockEditor
    },
  }
})

jest.mock('@tiptap/core', () => ({
  createDocument: (
    html: string,
    schema: unknown,
    parseOptions: unknown,
    options: unknown
  ) => mockCreateDocument(html, schema, parseOptions, options),
}))

jest.mock('@ui/web/components/editorExtensions', () => ({
  editorExtensions: [],
}))

jest.mock('@ui/web/components/chunkFocusUtils', () => ({
  scrollEditorToChunk: (editor: unknown, charOffset: number, chunkLength: number) => (
    mockScrollEditorToChunk(editor, charOffset, chunkLength)
  ),
}))

jest.mock('@ui/web/components/executeEditorCommand', () => ({
  executeEditorCommand: (payload: unknown) => mockExecuteEditorCommand(payload),
}))

jest.mock('@core/services/smartPaste', () => ({
  SmartPasteService: {
    buildPayload: jest.fn(),
    resolvePaste: jest.fn(),
  },
}))

jest.mock('@core/utils/prosemirrorCaret', () => ({
  placeCaretFromCoords: jest.fn(() => ({ handled: false })),
}))

jest.mock('@ui/web/lib/editor', () => ({
  applySelectionAsMarkdown: jest.fn(),
}))

const createMockEditor = () => {
  const tr = {
    replaceWith: jest.fn().mockReturnThis(),
    setMeta: jest.fn().mockReturnThis(),
  }
  return {
    getHTML: jest.fn(() => '<p>Saved</p>'),
    schema: { nodes: {} },
    options: {
      parseOptions: {},
      enableContentCheck: false,
    },
    state: {
      doc: { content: { size: 9 } },
      tr,
    },
    view: {
      dispatch: jest.fn(),
      dom: document.createElement('div'),
    },
    commands: {
      focus: jest.fn(),
    },
    can: () => ({
      undo: () => false,
      redo: () => false,
    }),
    __tr: tr,
  }
}

describe('RichTextEditorWebView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedConfig = null
    mockEditor = null
  })

  it('buffers scrollToChunk until the editor onCreate callback fires', () => {
    const ref = React.createRef<React.ElementRef<typeof RichTextEditorWebView>>()
    const createdEditor = createMockEditor()

    render(<RichTextEditorWebView ref={ref} initialContent="<p>Hello</p>" />)

    ref.current?.scrollToChunk(42, 8)

    expect(mockScrollEditorToChunk).not.toHaveBeenCalled()
    expect(capturedConfig?.onCreate).toBeTruthy()

    capturedConfig?.onCreate?.({ editor: createdEditor } as never)

    expect(mockScrollEditorToChunk).toHaveBeenCalledWith(createdEditor, 42, 8)
  })

  it('scrolls immediately when the editor instance is already available', () => {
    const ref = React.createRef<React.ElementRef<typeof RichTextEditorWebView>>()
    const editor = createMockEditor()
    mockEditor = editor

    render(<RichTextEditorWebView ref={ref} initialContent="<p>Hello</p>" />)

    ref.current?.scrollToChunk(12, 4)

    expect(mockScrollEditorToChunk).toHaveBeenCalledWith(editor, 12, 4)
  })

  it('delegates commands through executeEditorCommand', () => {
    const ref = React.createRef<React.ElementRef<typeof RichTextEditorWebView>>()
    const editor = createMockEditor()
    mockEditor = editor

    render(<RichTextEditorWebView ref={ref} initialContent="<p>Hello</p>" />)

    ref.current?.runCommand('toggleBold', 'arg-1')

    expect(mockExecuteEditorCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        editor,
        command: 'toggleBold',
        args: ['arg-1'],
      })
    )
  })

  it('replaces document content without adding to history', () => {
    const ref = React.createRef<React.ElementRef<typeof RichTextEditorWebView>>()
    const editor = createMockEditor()
    mockEditor = editor

    render(<RichTextEditorWebView ref={ref} initialContent="<p>Hello</p>" />)

    ref.current?.setContent('<p>Updated</p>')

    expect(mockCreateDocument).toHaveBeenCalledWith(
      '<p>Updated</p>',
      editor.schema,
      editor.options.parseOptions,
      { errorOnInvalidContent: false }
    )
    expect(editor.__tr.replaceWith).toHaveBeenCalledWith(0, 9, 'parsed-document')
    expect(editor.__tr.setMeta).toHaveBeenNthCalledWith(1, 'preventUpdate', true)
    expect(editor.__tr.setMeta).toHaveBeenNthCalledWith(2, 'addToHistory', false)
    expect(editor.view.dispatch).toHaveBeenCalledWith(editor.state.tr)
  })
})
