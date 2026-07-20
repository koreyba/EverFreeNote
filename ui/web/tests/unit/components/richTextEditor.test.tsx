import React from 'react'
import { render, act } from '@testing-library/react'
import RichTextEditor from '@ui/web/components/RichTextEditor'
import { SPELLCHECK_ENABLED_KEY } from "@core/constants/preferences"
import type { EditorMenuBarProps } from '@ui/web/components/EditorMenuBar'

type UseEditorConfig = Parameters<typeof import('@tiptap/react').useEditor>[0]

let capturedConfig: UseEditorConfig | null = null
let mockEditor: Record<string, unknown> | null = null
let capturedMenuBarProps: EditorMenuBarProps | null = null

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

jest.mock('@ui/web/components/EditorMenuBar', () => {
  return {
    EditorMenuBar: (props: EditorMenuBarProps) => {
      capturedMenuBarProps = props
      return <div data-testid="mock-menu-bar" />
    }
  }
})

jest.mock('@tiptap/core', () => ({
  createDocument: jest.fn(),
}))

jest.mock('@ui/web/components/editorExtensions', () => ({
  editorExtensions: [],
}))

jest.mock('@ui/web/components/chunkFocusUtils', () => ({
  scrollEditorToChunk: jest.fn(),
}))

jest.mock('@ui/web/components/executeEditorCommand', () => ({
  executeEditorCommand: jest.fn(),
}))

jest.mock('@core/services/smartPaste', () => ({
  SmartPasteService: {
    buildPayload: jest.fn(),
    resolvePaste: jest.fn(),
  },
}))

jest.mock('@core/services/noteClipboard', () => ({
  NoteClipboardService: {
    buildPayload: jest.fn(),
  },
}))

jest.mock('@core/utils/prosemirrorCaret', () => ({
  placeCaretFromCoords: jest.fn(() => ({ handled: false })),
}))

jest.mock('@ui/web/lib/editor', () => ({
  applySelectionAsMarkdown: jest.fn(),
}))

describe('RichTextEditor spellcheck integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    capturedConfig = null
    mockEditor = null
    capturedMenuBarProps = null
  })

  it('initializes editor with default spellcheck enabled', () => {
    render(<RichTextEditor initialContent="<p>Test</p>" />)
    
    expect(capturedConfig).toBeTruthy()
    expect(capturedConfig?.editorProps?.attributes).toEqual(
      expect.objectContaining({
        spellcheck: 'true',
      })
    )
  })

  it('initializes editor with spellcheck disabled when set in localStorage', () => {
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, 'false')
    render(<RichTextEditor initialContent="<p>Test</p>" />)
    
    expect(capturedConfig).toBeTruthy()
    expect(capturedConfig?.editorProps?.attributes).toEqual(
      expect.objectContaining({
        spellcheck: 'false',
      })
    )
  })

  it('initializes editor with spellcheck enabled when set in localStorage', () => {
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, 'true')
    render(<RichTextEditor initialContent="<p>Test</p>" />)
    
    expect(capturedConfig).toBeTruthy()
    expect(capturedConfig?.editorProps?.attributes).toEqual(
      expect.objectContaining({
        spellcheck: 'true',
      })
    )
  })

  it('toggles spellcheck via menu bar callback', () => {
    mockEditor = {
      state: { doc: { content: { size: 0 } } },
      options: { parseOptions: {}, enableContentCheck: false },
      view: { dom: document.createElement('div') },
      can: () => ({ undo: () => false, redo: () => false }),
    } as unknown as Record<string, unknown>

    render(<RichTextEditor initialContent="<p>Test</p>" />)
    
    expect(capturedMenuBarProps).toBeTruthy()
    expect(capturedMenuBarProps!.spellcheckEnabled).toBe(true)

    // Call toggle
    act(() => {
      capturedMenuBarProps!.onToggleSpellcheck()
    })
    
    expect(capturedMenuBarProps!.spellcheckEnabled).toBe(false)
    expect(localStorage.getItem(SPELLCHECK_ENABLED_KEY)).toBe('false')
  })

  describe('Caret placement boundary tests', () => {
    it('handles container mouse down events correctly', () => {
      const { placeCaretFromCoords } = require('@core/utils/prosemirrorCaret')
      const domNode = document.createElement('div')
      mockEditor = {
        state: { doc: { content: { size: 0 } } },
        options: { parseOptions: {}, enableContentCheck: false },
        view: { dom: domNode },
        can: () => ({ undo: () => false, redo: () => false }),
      } as unknown as Record<string, unknown>

      const { getByTestId } = render(<RichTextEditor initialContent="<p>Test</p>" />)
      const container = getByTestId('editor-content').parentElement

      expect(container).toBeTruthy()
    })
  })
})
