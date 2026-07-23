import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChunkSearchItem } from '@ui/web/components/features/search/ChunkSearchItem'
import type { RagChunk } from '@core/types/ragSearch'

function makeRagChunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    noteId: 'note-100',
    noteTitle: 'React Testing Principles',
    noteTags: ['testing', 'react'],
    chunkIndex: 0,
    charOffset: 25,
    bodyContent: 'Unit tests ensure logic correctness and prevent regressions.',
    overlapPrefix: '',
    content: 'Unit tests ensure logic correctness and prevent regressions.',
    similarity: 0.85,
    ...overrides,
  }
}

describe('ChunkSearchItem', () => {
  const defaultProps = {
    onOpenInContext: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering note title & content snippet', () => {
    it('renders note title and body content correctly', () => {
      const chunk = makeRagChunk({
        noteTitle: 'Architecture Overview',
        bodyContent: 'Clean architecture decouples UI from business domain.',
      })

      render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      const titleHeading = screen.getByRole('heading', { level: 3 })
      expect(titleHeading.textContent).toBe('Architecture Overview')
      expect(screen.getByText('Clean architecture decouples UI from business domain.')).toBeTruthy()
    })

    it('falls back to "Untitled" when noteTitle is empty string or falsy', () => {
      const chunk = makeRagChunk({
        noteTitle: '',
      })

      render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      const titleHeading = screen.getByRole('heading', { level: 3 })
      expect(titleHeading.textContent).toBe('Untitled')
      expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Open fragment from "Untitled" in context')
    })

    it('falls back to content property when bodyContent is missing or null', () => {
      const chunk = makeRagChunk({
        // @ts-expect-error testing runtime fallback
        bodyContent: null,
        content: 'Fallback content snippet text.',
      })

      render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      expect(screen.getByText('Fallback content snippet text.')).toBeTruthy()
    })
  })

  describe('Similarity score formatting & styling tiers', () => {
    it('renders similarity score percentage and emerald styling for score >= 0.8', () => {
      const chunk = makeRagChunk({ similarity: 0.92 })

      const { container } = render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      expect(screen.getByText('92%')).toBeTruthy()
      expect(screen.getByText('92%').className).toContain('text-emerald-400')
      expect(container.querySelector('[role="listitem"]')?.className).toContain('border-l-emerald-500')
    })

    it('renders similarity score percentage and amber styling for score >= 0.65 and < 0.8', () => {
      const chunk = makeRagChunk({ similarity: 0.72 })

      const { container } = render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      expect(screen.getByText('72%')).toBeTruthy()
      expect(screen.getByText('72%').className).toContain('text-amber-400')
      expect(container.querySelector('[role="listitem"]')?.className).toContain('border-l-amber-500')
    })

    it('renders default muted styling for score < 0.65', () => {
      const chunk = makeRagChunk({ similarity: 0.45 })

      const { container } = render(<ChunkSearchItem chunk={chunk} {...defaultProps} />)

      expect(screen.getByText('45%')).toBeTruthy()
      expect(screen.getByText('45%').className).toContain('text-muted-foreground/60')
      expect(container.querySelector('[role="listitem"]')?.className).toContain('border-l-border')
    })
  })

  describe('Content snippet highlighting', () => {
    it('highlights matching search terms in snippet', () => {
      const chunk = makeRagChunk({
        bodyContent: 'TypeScript interfaces provide strong type safety.',
      })

      render(<ChunkSearchItem chunk={chunk} highlightQuery="interfaces safety" {...defaultProps} />)

      const marks = screen.getAllByRole('mark')
      expect(marks).toHaveLength(2)
      expect(marks[0].textContent).toBe('interfaces')
      expect(marks[1].textContent).toBe('safety')
    })
  })

  describe('Click and Keyboard Interaction Handlers', () => {
    it('triggers onOpenInContext callback when item is clicked', () => {
      const onOpenInContext = jest.fn()
      const chunk = makeRagChunk({
        noteId: 'note-456',
        charOffset: 50,
        bodyContent: 'Sample text for testing offset calculation.',
      })

      render(<ChunkSearchItem chunk={chunk} onOpenInContext={onOpenInContext} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onOpenInContext).toHaveBeenCalledTimes(1)
      expect(onOpenInContext).toHaveBeenCalledWith('note-456', 50, expect.any(Number))
    })

    it('triggers onOpenInContext when Enter or Space key is pressed', () => {
      const onOpenInContext = jest.fn()
      const chunk = makeRagChunk({
        noteId: 'note-789',
        charOffset: 10,
        bodyContent: 'Keyboard navigation test snippet.',
      })

      render(<ChunkSearchItem chunk={chunk} onOpenInContext={onOpenInContext} />)

      const button = screen.getByRole('button')

      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onOpenInContext).toHaveBeenCalledTimes(1)
      expect(onOpenInContext).toHaveBeenCalledWith('note-789', 10, expect.any(Number))

      fireEvent.keyDown(button, { key: ' ' })
      expect(onOpenInContext).toHaveBeenCalledTimes(2)

      // Other keys should not trigger callback
      fireEvent.keyDown(button, { key: 'Tab' })
      expect(onOpenInContext).toHaveBeenCalledTimes(2)
    })
  })
})
