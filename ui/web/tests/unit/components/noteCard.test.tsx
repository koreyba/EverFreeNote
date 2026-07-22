import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { NoteCard } from '@/components/features/notes/NoteCard'
import type { Note, SearchResult } from '@core/types/domain'

const mockConsumeLongPress = jest.fn(() => false)

jest.mock('@ui/web/hooks/useLongPress', () => ({
  useLongPress: () => ({ longPressHandlers: {}, consumeLongPress: mockConsumeLongPress }),
}))

function makeNote(overrides: Partial<Note & { headline?: string | null; rank?: number | null }> = {}): Note & { headline?: string | null; rank?: number | null } {
  return {
    id: 'note-1',
    user_id: 'user-1',
    title: 'A note',
    description: '<p>Safe <strong>description</strong></p>',
    tags: ['one', 'two', 'three', 'four', 'five', 'six'],
    created_at: '2025-12-31T10:00:00.000Z',
    updated_at: '2025-12-31T10:00:00.000Z',
    ...overrides,
  }
}

function renderCard(overrides: Partial<React.ComponentProps<typeof NoteCard>> = {}) {
  const onClick = jest.fn()
  const onToggleSelect = jest.fn()
  const onTagClick = jest.fn()
  const view = render(
    <NoteCard
      note={makeNote()}
      variant="compact"
      onClick={onClick}
      onToggleSelect={onToggleSelect}
      onTagClick={onTagClick}
      {...overrides}
    />,
  )
  return { ...view, onClick, onToggleSelect, onTagClick }
}

describe('NoteCard', () => {
  beforeEach(() => {
    mockConsumeLongPress.mockReset()
    mockConsumeLongPress.mockReturnValue(false)
  })

  it('renders compact notes with sanitized description, truncated tags, and title/tag actions', () => {
    const { onClick, onTagClick } = renderCard()

    expect(screen.getByRole('button', { name: 'A note' })).toBeTruthy()
    expect(screen.getByText('Safe description')).toBeTruthy()
    expect(screen.getByText('one')).toBeTruthy()
    expect(screen.getByText('three')).toBeTruthy()
    expect(screen.queryByText('four')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'A note' }))
    fireEvent.click(screen.getByText('two'))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onTagClick).toHaveBeenCalledWith('two')
  })

  it('uses the untitled and empty-description fallbacks', () => {
    renderCard({ note: makeNote({ title: '', description: '' }), onToggleSelect: undefined })

    expect(screen.getByRole('button', { name: 'Untitled' })).toBeTruthy()
    expect(screen.getByText(/2025/)).toBeTruthy()
  })

  it('toggles selection through the checkbox without activating the card', () => {
    const { onClick, onToggleSelect } = renderCard({ selectionMode: true, isSelected: true })
    const checkbox = screen.getByRole('checkbox', { name: 'Select note "A note"' })

    expect(checkbox.getAttribute('data-state')).toBe('checked')
    fireEvent.click(checkbox)

    expect(onToggleSelect).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not activate the card after a long press or while selecting text inside it', () => {
    const { onClick } = renderCard()
    const card = screen.getByTestId('note-card')

    mockConsumeLongPress.mockReturnValueOnce(true)
    fireEvent.click(card)
    expect(onClick).not.toHaveBeenCalled()

    const selection = {
      isCollapsed: false,
      rangeCount: 1,
      anchorNode: screen.getByRole('button', { name: 'A note' }).firstChild,
      focusNode: screen.getByRole('button', { name: 'A note' }).firstChild,
    }
    const getSelection = window.getSelection
    Object.defineProperty(window, 'getSelection', { configurable: true, value: () => selection })
    fireEvent.click(card)
    expect(onClick).not.toHaveBeenCalled()
    Object.defineProperty(window, 'getSelection', { configurable: true, value: getSelection })

    fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each([
    [0.9, 'border-l-emerald-500', '90%'],
    [0.7, 'border-l-amber-500', '70%'],
    [0.4, 'border-l-border', '40%'],
  ])('renders search rank styling for %s', (rank, accentClass, score) => {
    const searchNote = makeNote({ headline: '<b>Highlighted</b> headline', rank }) as SearchResult
    renderCard({ note: searchNote, variant: 'search' })

    expect(screen.getByTestId('note-card').className).toContain(accentClass)
    expect(screen.getByText(score)).toBeTruthy()
    expect(screen.getByText('Highlighted headline')).toBeTruthy()
  })

  it('sanitizes and highlights search headlines, including query metacharacters', () => {
    const searchNote = makeNote({ headline: '<b>alpha</b> [beta] <script>bad()</script>', rank: null }) as SearchResult
    renderCard({ note: searchNote, variant: 'search', highlightQuery: '[beta] alpha alpha' })

    expect(screen.getAllByRole('mark').map((element) => element.textContent)).toEqual(['alpha', '[beta]'])
    expect(screen.queryByText('bad()')).toBeNull()
    expect(screen.queryByText('<b>')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
  })

  it('shows at most five search tags and the remaining count', () => {
    const searchNote = makeNote({ headline: null, rank: undefined }) as SearchResult
    renderCard({ note: searchNote, variant: 'search' })

    expect(screen.getByText('+1')).toBeTruthy()
    expect(screen.queryByText('six')).toBeNull()
  })
})
