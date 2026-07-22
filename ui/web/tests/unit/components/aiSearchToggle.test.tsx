import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AiSearchToggle } from '@ui/web/components/features/search/AiSearchToggle'

type MatchMediaMock = ReturnType<typeof createMatchMedia>

function createMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQuery = {
    matches,
    media: '(hover: hover) and (pointer: fine)',
    onchange: null,
    addEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
    removeEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
    dispatchEvent: jest.fn(() => true),
  } as unknown as MediaQueryList
  return { mediaQuery, listeners }
}

function installMatchMedia(matches: boolean): MatchMediaMock {
  const mock = createMatchMedia(matches)
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: jest.fn(() => mock.mediaQuery) })
  return mock
}

describe('AiSearchToggle', () => {
  it('toggles an available AI search setting and cleans up its media listener', () => {
    const matchMedia = installMatchMedia(true)
    const onChange = jest.fn()
    const { unmount } = render(<AiSearchToggle enabled={false} hasApiKey onChange={onChange} />)

    const toggle = screen.getByRole('switch', { name: 'Toggle AI RAG Search' })
    expect((toggle as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(toggle)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('ai-search-toggle-info-trigger')).toBeTruthy()

    unmount()
    expect(matchMedia.mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('disables the switch and describes the missing API key reason', () => {
    installMatchMedia(true)
    const onChange = jest.fn()
    render(<AiSearchToggle enabled onChange={onChange} hasApiKey={false} />)

    const toggle = screen.getByRole('switch', { name: 'Toggle AI RAG Search' })
    const trigger = screen.getByTestId('ai-search-toggle-trigger')
    expect((toggle as HTMLButtonElement).disabled).toBe(true)
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.getAttribute('aria-describedby')).toBe('ai-search-toggle-missing-key-hint')
    fireEvent.click(toggle)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens and closes the selection-blocked hint on touch and keyboard input', async () => {
    installMatchMedia(false)
    const onChange = jest.fn()
    render(<AiSearchToggle enabled={false} hasApiKey onChange={onChange} disabled disabledTitle="Select a note first" />)

    const trigger = screen.getByTestId('ai-search-toggle-trigger')
    fireEvent.pointerDown(trigger)
    expect((await screen.findByTestId('ai-search-toggle-disabled-hint')).textContent).toContain('Select a note first')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByTestId('ai-search-toggle-disabled-hint')).toBeNull())
    fireEvent.keyDown(trigger, { key: ' ' })
    expect(await screen.findByTestId('ai-search-toggle-disabled-hint')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByTestId('ai-search-toggle-disabled-hint')).toBeNull())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes the selection hint when the blocking condition is removed', async () => {
    installMatchMedia(false)
    const onChange = jest.fn()
    const { rerender } = render(<AiSearchToggle enabled={false} hasApiKey onChange={onChange} disabled disabledTitle="Select a note first" />)
    fireEvent.pointerDown(screen.getByTestId('ai-search-toggle-trigger'))
    expect(await screen.findByTestId('ai-search-toggle-disabled-hint')).toBeTruthy()

    rerender(<AiSearchToggle enabled={false} hasApiKey onChange={onChange} />)
    await waitFor(() => expect(screen.queryByTestId('ai-search-toggle-disabled-hint')).toBeNull())
  })
})
