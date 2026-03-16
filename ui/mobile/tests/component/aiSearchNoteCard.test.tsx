import { fireEvent, render, screen } from '../testUtils'
import { AiSearchNoteCard } from '@ui/mobile/components/search/AiSearchNoteCard'
import type { RagNoteGroup } from '@core/types/ragSearch'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      card: '#101820',
      border: '#2d3748',
      accent: '#1f2937',
      primary: '#22c55e',
      primaryForeground: '#ffffff',
      foreground: '#f8fafc',
      mutedForeground: '#94a3b8',
      secondary: '#111827',
      background: '#020617',
    },
  }),
}))

const createGroup = (overrides: Partial<RagNoteGroup> = {}): RagNoteGroup => ({
  noteId: overrides.noteId ?? 'note-1',
  noteTitle: overrides.noteTitle ?? 'AI result note',
  noteTags: overrides.noteTags ?? ['tag-a', 'tag-b'],
  topScore: overrides.topScore ?? 0.84,
  hiddenCount: overrides.hiddenCount ?? 0,
  chunks: overrides.chunks ?? [
    {
      noteId: overrides.noteId ?? 'note-1',
      noteTitle: overrides.noteTitle ?? 'AI result note',
      noteTags: overrides.noteTags ?? ['tag-a', 'tag-b'],
      chunkIndex: 0,
      charOffset: 20,
      content: 'Primary chunk content',
      similarity: 0.84,
    },
    {
      noteId: overrides.noteId ?? 'note-1',
      noteTitle: overrides.noteTitle ?? 'AI result note',
      noteTags: overrides.noteTags ?? ['tag-a', 'tag-b'],
      chunkIndex: 1,
      charOffset: 360,
      content: 'Secondary chunk content',
      similarity: 0.8,
    },
  ],
})

describe('AiSearchNoteCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens the top chunk from the primary snippet button', () => {
    const onOpenInContext = jest.fn()

    render(
      <AiSearchNoteCard
        group={createGroup()}
        onOpenInContext={onOpenInContext}
      />
    )

    fireEvent.press(screen.getByTestId('ai-note-top-chunk-note-1'))

    expect(onOpenInContext).toHaveBeenCalledWith({
      id: 'note-1',
      title: 'AI result note',
      tags: ['tag-a', 'tag-b'],
    }, 20, 'Primary chunk content'.length)
  })

  it('toggles selection instead of opening the note while selection mode is active', () => {
    const onOpenInContext = jest.fn()
    const onToggleSelect = jest.fn()

    render(
      <AiSearchNoteCard
        group={createGroup()}
        onOpenInContext={onOpenInContext}
        selectionMode
        isSelected
        onToggleSelect={onToggleSelect}
      />
    )

    const card = screen.getByTestId('ai-note-card-note-1')
    fireEvent.press(card)

    expect(card.props.accessibilityRole).toBe('checkbox')
    expect(card.props.accessibilityState).toEqual({ checked: true })
    expect(onToggleSelect).toHaveBeenCalledWith('note-1')
    expect(onOpenInContext).not.toHaveBeenCalled()
  })

  it('renders the hidden-fragment message without an expand button when only suppressed matches remain', () => {
    render(
      <AiSearchNoteCard
        group={createGroup({
          hiddenCount: 3,
          chunks: [
            {
              noteId: 'note-1',
              noteTitle: 'AI result note',
              noteTags: ['tag-a'],
              chunkIndex: 0,
              charOffset: 10,
              content: 'Only visible chunk',
              similarity: 0.77,
            },
          ],
        })}
        onOpenInContext={jest.fn()}
      />
    )

    expect(screen.getByText('+3 similar fragments hidden')).toBeTruthy()
    expect(screen.queryByText(/more fragment/i)).toBeNull()
  })

  it('expands extra chunks and opens the chosen fragment in context', () => {
    const onOpenInContext = jest.fn()

    render(
      <AiSearchNoteCard
        group={createGroup({
          hiddenCount: 2,
          chunks: [
            {
              noteId: 'note-1',
              noteTitle: 'AI result note',
              noteTags: ['tag-a'],
              chunkIndex: 0,
              charOffset: 10,
              content: 'Only visible chunk',
              similarity: 0.9,
            },
            {
              noteId: 'note-1',
              noteTitle: 'AI result note',
              noteTags: ['tag-a'],
              chunkIndex: 1,
              charOffset: 420,
              content: 'Second fragment',
              similarity: 0.8,
            },
          ],
        })}
        onOpenInContext={onOpenInContext}
      />
    )

    fireEvent.press(screen.getByText('1 more fragment'))
    fireEvent.press(screen.getByTestId('ai-note-extra-chunk-note-1-1'))

    expect(screen.getByText('Hide fragments')).toBeTruthy()
    expect(screen.getByText('+2 similar fragments hidden')).toBeTruthy()
    expect(onOpenInContext).toHaveBeenCalledWith({
      id: 'note-1',
      title: 'AI result note',
      tags: ['tag-a', 'tag-b'],
    }, 420, 'Second fragment'.length)
  })
})
