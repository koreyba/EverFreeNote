import React from 'react'
import { createEvent, fireEvent, render, screen } from '@testing-library/react'

import { HorizontalTagScroll } from '@/components/HorizontalTagScroll'

describe('HorizontalTagScroll', () => {
  it('exposes the scroll element, combines classes, and forwards ordinary clicks', () => {
    const ref = React.createRef<HTMLDivElement>()
    const onClick = jest.fn()

    render(
      <HorizontalTagScroll ref={ref} className="custom-scroll" onClick={onClick}>
        <button type="button">Tag child</button>
      </HorizontalTagScroll>,
    )

    const container = screen.getByRole('button', { name: 'Tag child' }).parentElement as HTMLDivElement
    expect(ref.current).toBe(container)
    expect(container.className).toContain('custom-scroll')

    fireEvent.click(screen.getByRole('button', { name: 'Tag child' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('translates vertical wheel movement into horizontal scrolling', () => {
    render(<HorizontalTagScroll>content</HorizontalTagScroll>)
    const container = screen.getByText('content') as HTMLDivElement
    Object.defineProperty(container, 'scrollLeft', { configurable: true, value: 10, writable: true })
    const nativeWheel = jest.fn()
    container.addEventListener('wheel', (event) => nativeWheel((event as WheelEvent).deltaY))

    const zeroDelta = fireEvent.wheel(container, { deltaY: 0 })
    expect(zeroDelta).toBe(true)
    expect(container.scrollLeft).toBe(10)

    const wheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 24 })
    container.dispatchEvent(wheelEvent)
    expect(nativeWheel).toHaveBeenCalledWith(24)
    expect(container.scrollLeft).toBe(34)
  })

  it('drag-scrolls globally, resets styles on pointer up, and suppresses the following click', () => {
    const onClick = jest.fn()
    render(
      <HorizontalTagScroll onClick={onClick}>
        <button type="button">Tag child</button>
      </HorizontalTagScroll>,
    )
    const container = screen.getByRole('button', { name: 'Tag child' }).parentElement as HTMLDivElement
    Object.defineProperty(container, 'offsetLeft', { configurable: true, value: 10 })
    Object.defineProperty(container, 'scrollLeft', { configurable: true, value: 100, writable: true })

    const pointerDown = createEvent.pointerDown(container)
    Object.defineProperty(pointerDown, 'pageX', { value: 50 })
    fireEvent(container, pointerDown)
    const pointerMove = createEvent.pointerMove(window)
    Object.defineProperty(pointerMove, 'pageX', { value: 80 })
    fireEvent(window, pointerMove)
    expect(container.scrollLeft).toBe(70)
    expect(container.style.cursor).toBe('grabbing')
    expect(container.style.userSelect).toBe('none')

    fireEvent.click(screen.getByRole('button', { name: 'Tag child' }))
    expect(onClick).not.toHaveBeenCalled()

    fireEvent.pointerUp(window)
    expect(container.style.cursor).toBe('')
    expect(container.style.userSelect).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Tag child' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('removes global pointer listeners when unmounted', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener')
    const { unmount } = render(<HorizontalTagScroll>content</HorizontalTagScroll>)

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    removeSpy.mockRestore()
  })
})
