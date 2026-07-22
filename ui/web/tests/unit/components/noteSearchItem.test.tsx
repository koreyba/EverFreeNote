import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { NoteSearchItem } from '@/components/features/search/NoteSearchItem'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

function makeChunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    noteId: 'note-1',
    noteTitle: 'RAG note',
    noteTags: ['topic'],
    chunkIndex: 0,
    charOffset: 12,
    bodyContent: 'Top fragment body',
    overlapPrefix: '',
    content: 'Top fragment body',
    similarity: 0.91,
    ...overrides,
  }
}

function makeGroup(overrides: Partial<RagNoteGroup> = {}): RagNoteGroup {
  return {
    noteId: 'note-1',
    noteTitle: 'RAG note',
    noteTags: ['topic'],
    topScore: 0.91,
    chunks: [makeChunk()],
    hiddenCount: 0,
    ...overrides,
  }
}

describe('NoteSearchItem', () => {
  it('opens the top fragment with its note id, offset, and body length', () => {
    const onOpenInContext = jest.fn()
    render(<NoteSearchItem group={makeGroup({ chunks: [makeChunk({ bodyContent: 'Top body\n\nTags: topic' })] })} onOpenInContext={onOpenInContext} />)

    fireEvent.click(screen.getByRole('button', { name: /Open top fragment/ }))

    expect(onOpenInContext).toHaveBeenCalledWith('note-1', 12, 8)
    expect(screen.getByText('91%')).toBeTruthy()
  })

  it('supports keyboard activation and does not open while text is selected in the item', () => {
    const onOpenInContext = jest.fn()
    render(<NoteSearchItem group={makeGroup()} onOpenInContext={onOpenInContext} />)
    const topChunk = screen.getByRole('button', { name: /Open top fragment/ })

    fireEvent.keyDown(topChunk, { key: 'Enter' })
    fireEvent.keyDown(topChunk, { key: ' ' })
    expect(onOpenInContext).toHaveBeenCalledTimes(2)

    const getSelection = window.getSelection
    const selectedNode = topChunk.querySelector('p')?.firstChild ?? topChunk.firstChild
    Object.defineProperty(window, 'getSelection', {
      configurable: true,
      value: () => ({ rangeCount: 1, toString: () => 'selected text', anchorNode: selectedNode, focusNode: selectedNode }),
    })
    fireEvent.click(topChunk)
    expect(onOpenInContext).toHaveBeenCalledTimes(2)
    Object.defineProperty(window, 'getSelection', { configurable: true, value: getSelection })
  })

  it('expands and collapses extra fragments and reports hidden fragments', () => {
    const onOpenInContext = jest.fn()
    const secondChunk = makeChunk({ chunkIndex: 1, charOffset: 40, bodyContent: 'Second body', content: '' })
    render(
      <NoteSearchItem
        group={makeGroup({ chunks: [makeChunk(), secondChunk], hiddenCount: 1 })}
        onOpenInContext={onOpenInContext}
      />,
    )

    const toggle = screen.getByRole('button', { name: '2 more fragments' })
    fireEvent.click(toggle)
    expect(screen.getByText('Fragment 2')).toBeTruthy()
    expect(screen.getByText('+1 similar fragments hidden')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Open fragment 2/ }))
    expect(onOpenInContext).toHaveBeenCalledWith('note-1', 40, 11)

    fireEvent.click(screen.getByRole('button', { name: 'Hide fragments' }))
    expect(screen.queryByText('Fragment 2')).toBeNull()
  })

  it('forwards tag clicks and switches chunk/card clicks to selection mode', () => {
    const onOpenInContext = jest.fn()
    const onTagClick = jest.fn()
    const onToggleSelect = jest.fn()
    const { rerender } = render(
      <NoteSearchItem
        group={makeGroup()}
        onOpenInContext={onOpenInContext}
        onTagClick={onTagClick}
        onToggleSelect={onToggleSelect}
      />,
    )

    fireEvent.click(screen.getByText('topic'))
    expect(onTagClick).toHaveBeenCalledWith('topic')

    rerender(
      <NoteSearchItem
        group={makeGroup()}
        onOpenInContext={onOpenInContext}
        onTagClick={onTagClick}
        onToggleSelect={onToggleSelect}
        selectionMode
        isSelected
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Open top fragment/ }))
    fireEvent.click(screen.getByRole('button', { name: /Toggle selection for note/ }))

    expect(onTagClick).toHaveBeenCalledTimes(1)
    expect(onToggleSelect).toHaveBeenCalledWith('note-1')
    expect(onOpenInContext).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Toggle selection for note/ }).getAttribute('aria-pressed')).toBe('true')
  })

  it.each([
    [0.9, 'border-l-emerald-500', '90%'],
    [0.7, 'border-l-amber-500', '70%'],
    [0.4, 'border-l-border', '40%'],
  ])('renders score styling at %s', (score, className, label) => {
    render(<NoteSearchItem group={makeGroup({ topScore: score })} onOpenInContext={jest.fn()} />)
    expect(screen.getByRole('article').className).toContain(className)
    expect(screen.getByText(label)).toBeTruthy()
  })

  it('renders the untitled and no-top-chunk fallbacks', () => {
    render(
      <NoteSearchItem
        group={makeGroup({ noteTitle: '', chunks: [], hiddenCount: 2 })}
        onOpenInContext={jest.fn()}
      />,
    )

    expect(screen.getByText('Untitled')).toBeTruthy()
    expect(screen.getByText('2 more fragments')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '2 more fragments' }))
    expect(screen.getByText('+2 similar fragments hidden')).toBeTruthy()
  })
})
