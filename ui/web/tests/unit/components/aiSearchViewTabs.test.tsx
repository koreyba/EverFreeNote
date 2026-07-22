import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiSearchViewTabs } from '@ui/web/components/features/search/AiSearchViewTabs'

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQuery = {
    matches,
    media: '(hover: hover) and (pointer: fine)',
    onchange: null,
    addEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
    removeEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
    dispatchEvent: jest.fn(() => true),
  } as unknown as MediaQueryList
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: jest.fn(() => mediaQuery) })
  return mediaQuery
}

describe('AiSearchViewTabs', () => {
  it('changes between note and chunk views and ignores unsupported values', () => {
    installMatchMedia(true)
    const onChange = jest.fn()
    const { rerender } = render(<AiSearchViewTabs value="note" onChange={onChange} />)

    const note = screen.getByRole('radio', { name: 'Note view' })
    const chunk = screen.getByRole('radio', { name: 'Chunk view' })
    expect(note.getAttribute('data-state')).toBe('on')
    fireEvent.click(chunk)
    expect(onChange).toHaveBeenCalledWith('chunk')
    rerender(<AiSearchViewTabs value="chunk" onChange={onChange} />)
    fireEvent.click(note)
    expect(onChange).toHaveBeenCalledWith('note')
  })

  it('blocks disabled tabs and exposes the disabled state without a tooltip when no title exists', () => {
    installMatchMedia(true)
    const onChange = jest.fn()
    render(<AiSearchViewTabs value="chunk" onChange={onChange} disabled />)

    const note = screen.getByRole('radio', { name: 'Note view' })
    const chunk = screen.getByRole('radio', { name: 'Chunk view' })
    expect(note.getAttribute('aria-disabled')).toBe('true')
    expect(note.getAttribute('data-disabled')).toBe('true')
    expect(note.getAttribute('tabindex')).toBe('-1')
    expect(chunk.getAttribute('data-state')).toBe('on')
    fireEvent.pointerDown(note)
    fireEvent.click(note)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens the disabled hint on touch, closes outside, and removes it when enabled', async () => {
    const mediaQuery = installMatchMedia(false)
    const onChange = jest.fn()
    const { rerender, unmount } = render(
      <AiSearchViewTabs value="note" onChange={onChange} disabled disabledTitle="Choose a note first" />
    )

    const trigger = screen.getByTestId('ai-search-view-tabs-trigger')
    fireEvent.pointerDown(trigger)
    expect((await screen.findByTestId('ai-search-view-tabs-disabled-hint')).textContent).toContain('Choose a note first')
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByTestId('ai-search-view-tabs-disabled-hint')).toBeNull())

    fireEvent.pointerDown(trigger)
    expect(await screen.findByTestId('ai-search-view-tabs-disabled-hint')).toBeTruthy()
    rerender(<AiSearchViewTabs value="note" onChange={onChange} />)
    await waitFor(() => expect(screen.queryByTestId('ai-search-view-tabs-disabled-hint')).toBeNull())
    unmount()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
