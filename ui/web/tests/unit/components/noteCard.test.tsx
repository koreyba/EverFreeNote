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

  it('separates lines in a saved multiline note preview without changing its text', () => {
    renderCard({ note: makeNote({ description: '<p>Привет 😀 &lt; 2 &amp; 7 &gt; 3<br><br><br>尾 строка!</p>' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('Привет 😀 < 2 & 7 > 3 尾 строка!')
    expect(preview?.querySelector('br')).toBeNull()
  })

  it('separates block elements while keeping inline formatting contiguous', () => {
    renderCard({ note: makeNote({ description: '<p>First<strong>bold</strong>word</p><ul><li>Second</li><li><em>Third</em></li></ul><div>Fourth</div>' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('Firstboldword Second Third Fourth')
    expect(preview?.querySelector('strong, em, ul')).toBeNull()
  })

  it('keeps legacy plain entity sequences literal', () => {
    renderCard({ note: makeNote({ description: 'Literal &amp; &copy=2 and &#39;' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('Literal &amp; &copy=2 and &#39;')
  })

  it('retains the legacy interpretation when markup has no recognized rich-text tags', () => {
    renderCard({ note: makeNote({ description: '<custom>Legacy &amp; &copy=2</custom>' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('Legacy &amp; ©=2')
  })

  it('does not mistake a tag name in an attribute for actual rich-text markup', () => {
    renderCard({ note: makeNote({ description: '<custom data-test="<p>">Legacy &amp;</custom>' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('Legacy &amp;')
  })

  it('decodes exactly one layer of entities in tagged HTML', () => {
    renderCard({ note: makeNote({ description: '<p>Original &amp;amp; &#39; &copy=2 &lt;X&gt;</p>' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent)
      .toBe("Original &amp; ' ©=2 <X>")
    expect(screen.getByTestId('note-card').querySelector('p x')).toBeNull()
  })

  it('decodes encoded nonbreaking spaces and preserves line boundaries', () => {
    renderCard({ note: makeNote({ description: '<p>&nbsp;Alpha<br>Beta&nbsp;</p>' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('\u00a0Alpha Beta\u00a0')
  })

  it('decodes entities inside inline-only HTML without splitting the text', () => {
    renderCard({ note: makeNote({ description: 'A<strong>&amp;</strong><em>尾&#x1f600;</em>' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('A&尾😀')
    expect(preview?.querySelector('strong, em')).toBeNull()
  })

  it('shows CRLF and empty lines as a readable separation in plain text', () => {
    renderCard({ note: makeNote({ description: 'Начало 😀\r\n\r\n\r\n尾 строка' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('Начало 😀 尾 строка')
  })

  it('preserves nonbreaking spaces at the edges of the preview', () => {
    renderCard({ note: makeNote({ description: ' \r\n\u00a0First\u00a0 \r\n' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('\u00a0First\u00a0')
  })

  it('ignores markup-looking text inside attributes and preserves inline words', () => {
    renderCard({ note: makeNote({ description: '<p title="before > after &lt;br&gt;">A<strong>B</strong><span>C</span></p><p>D</p>' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('ABC D')
    expect(preview?.querySelector('strong, span')).toBeNull()
  })

  it('omits dangerous content without merging adjacent lines', () => {
    renderCard({ note: makeNote({ description: 'start<br>safe<script>bad()</script><style>bad</style>' }) })

    const preview = screen.getByTestId('note-card').querySelector('p')
    expect(preview?.textContent).toBe('start safe')
    expect(preview?.querySelector('script, style')).toBeNull()
  })

  it('does not treat markup inside removed script and style content as visible HTML', () => {
    renderCard({ note: makeNote({ description: 'Safe &amp; &copy=2<script><p>bad()</p></script><style>.bad{color:red}</style>' }) })

    expect(screen.getByTestId('note-card').querySelector('p')?.textContent).toBe('Safe &amp; ©=2')
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
