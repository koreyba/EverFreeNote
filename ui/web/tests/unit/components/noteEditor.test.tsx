import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { NoteEditor, type NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'

const mockSetEditorContent = jest.fn()
let mockEditorHtml = '<p>Body A</p>'

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: require('react').forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.ForwardedRef<HTMLInputElement>) => (
    <input ref={ref} {...props} />
  )),
}))

jest.mock('@/components/RichTextEditor', () => {
  const React = require('react')

  return React.forwardRef((
    props: { initialContent: string; onContentChange?: () => void },
    ref: React.ForwardedRef<{ getHTML: () => string; setContent: (html: string) => void; scrollToChunk: () => void }>
  ) => {
    const initializedRef = React.useRef(false)
    if (!initializedRef.current) {
      mockEditorHtml = props.initialContent
      initializedRef.current = true
    }

    React.useImperativeHandle(ref, () => ({
      getHTML: () => mockEditorHtml,
      setContent: (html: string) => {
        mockSetEditorContent(html)
        mockEditorHtml = html
      },
      runCommand: jest.fn(),
      scrollToChunk: jest.fn(),
    }))

    return (
      <div data-testid="rich-text-editor">
        <button
          type="button"
          onClick={() => {
            mockEditorHtml = '<p>Local body</p>'
            props.onContentChange?.()
          }}
        >
          Change body
        </button>
        <span>{mockEditorHtml}</span>
      </div>
    )
  })
})

jest.mock('@/components/TagInput', () => ({
  TagInput: ({
    tags,
    onAddTags,
  }: {
    tags: string[]
    onAddTags: (tags: string[]) => void
  }) => (
    <div>
      <button type="button" onClick={() => onAddTags(['local-tag'])}>
        Add local tag
      </button>
      <div data-testid="selected-tags">{tags.join(',')}</div>
    </div>
  ),
}))

jest.mock('@/components/features/notes/MoreActionsMenu', () => ({
  MoreActionsMenu: () => <div data-testid="more-actions-menu" />,
}))

jest.mock('@ui/web/hooks/useTagSuggestions', () => ({
  useTagSuggestions: () => [],
}))

describe('NoteEditor same-note autosave reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEditorHtml = '<p>Body A</p>'
  })

  const renderEditor = (props: Partial<React.ComponentProps<typeof NoteEditor>> = {}) => {
    const ref = React.createRef<NoteEditorHandle>()
    const onAutoSave = jest.fn()
    const rendered = render(
      <NoteEditor
        ref={ref}
        noteId="note-1"
        initialTitle="First"
        initialDescription="<p>Body A</p>"
        initialTags="tag-a"
        isSaving={false}
        onSave={jest.fn()}
        onRead={jest.fn()}
        onAutoSave={onAutoSave}
        {...props}
      />
    )

    return { ref, onAutoSave, ...rendered }
  }

  it('preserves a dirty local title when the same note refreshes with stale data', async () => {
    const { rerender, ref, onAutoSave } = renderEditor()

    fireEvent.change(screen.getByPlaceholderText('Note title'), {
      target: { value: 'Second' },
    })

    rerender(
      <NoteEditor
        ref={ref}
        noteId="note-1"
        initialTitle="First"
        initialDescription="<p>Body A</p>"
        initialTags="tag-a"
        isSaving={false}
        onSave={jest.fn()}
        onRead={jest.fn()}
        onAutoSave={onAutoSave}
      />
    )

    expect((screen.getByPlaceholderText('Note title') as HTMLInputElement).value).toBe('Second')

    await act(async () => {
      await ref.current?.flushPendingSave()
    })

    expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'note-1',
      title: 'Second',
    }))
  })

  it('adopts clean external updates for title, body, and tags on same-note refresh', async () => {
    const { rerender, ref, onAutoSave } = renderEditor()

    rerender(
      <NoteEditor
        ref={ref}
        noteId="note-1"
        initialTitle="Remote title"
        initialDescription="<p>Remote body</p>"
        initialTags="remote-tag"
        isSaving={false}
        onSave={jest.fn()}
        onRead={jest.fn()}
        onAutoSave={onAutoSave}
      />
    )

    expect((screen.getByPlaceholderText('Note title') as HTMLInputElement).value).toBe('Remote title')
    expect(mockSetEditorContent).toHaveBeenCalledWith('<p>Remote body</p>')
    expect(screen.getByTestId('selected-tags').textContent).toBe('remote-tag')

    await act(async () => {
      await ref.current?.flushPendingSave()
    })

    expect(onAutoSave).not.toHaveBeenCalled()
  })

  it('preserves dirty fields while still applying clean external fields', async () => {
    const { rerender, ref, onAutoSave } = renderEditor()

    fireEvent.change(screen.getByPlaceholderText('Note title'), {
      target: { value: 'Local title' },
    })

    rerender(
      <NoteEditor
        ref={ref}
        noteId="note-1"
        initialTitle="Remote title"
        initialDescription="<p>Remote body</p>"
        initialTags="remote-tag"
        isSaving={false}
        onSave={jest.fn()}
        onRead={jest.fn()}
        onAutoSave={onAutoSave}
      />
    )

    expect((screen.getByPlaceholderText('Note title') as HTMLInputElement).value).toBe('Local title')
    expect(mockSetEditorContent).toHaveBeenCalledWith('<p>Remote body</p>')
    expect(screen.getByTestId('selected-tags').textContent).toBe('remote-tag')

    await act(async () => {
      await ref.current?.flushPendingSave()
    })

    expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'note-1',
      title: 'Local title',
      description: '<p>Remote body</p>',
      tags: 'remote-tag',
    }))
  })

  it('treats a matching same-note refresh as an acknowledgement and avoids a duplicate flush save', async () => {
    const { rerender, ref, onAutoSave } = renderEditor()

    fireEvent.change(screen.getByPlaceholderText('Note title'), {
      target: { value: 'Saved locally' },
    })

    rerender(
      <NoteEditor
        ref={ref}
        noteId="note-1"
        initialTitle="Saved locally"
        initialDescription="<p>Body A</p>"
        initialTags="tag-a"
        isSaving={false}
        onSave={jest.fn()}
        onRead={jest.fn()}
        onAutoSave={onAutoSave}
      />
    )

    await act(async () => {
      await ref.current?.flushPendingSave()
    })

    expect(onAutoSave).not.toHaveBeenCalled()
  })
})
