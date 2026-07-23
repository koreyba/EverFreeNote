import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

describe('ScrollArea component', () => {
  it('has correct displayName', () => {
    expect(ScrollArea.displayName).toBeDefined()
  })

  it('renders children correctly', () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div>Scrollable Content</div>
      </ScrollArea>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    expect(scrollArea).toBeTruthy()
    expect(screen.getByText('Scrollable Content')).toBeTruthy()
  })

  it('applies default classes and merges custom className', () => {
    render(
      <ScrollArea data-testid="scroll-area" className="custom-scroll-area">
        <div>Content</div>
      </ScrollArea>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    expect(scrollArea.className).toContain('relative')
    expect(scrollArea.className).toContain('overflow-hidden')
    expect(scrollArea.className).toContain('custom-scroll-area')
  })

  it('forwards ref to the Root element', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <ScrollArea ref={ref} data-testid="scroll-area">
        <div>Content</div>
      </ScrollArea>
    )

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('passes additional props to Root', () => {
    render(
      <ScrollArea data-testid="scroll-area" type="always" dir="rtl">
        <div>Content</div>
      </ScrollArea>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    expect(scrollArea.getAttribute('dir')).toBe('rtl')
    expect(scrollArea.getAttribute('data-state')).toBeTruthy()
  })
})

describe('ScrollBar component', () => {
  it('has correct displayName', () => {
    expect(ScrollBar.displayName).toBeDefined()
  })

  it('renders vertical scrollbar inside ScrollArea type="always"', () => {
    render(
      <ScrollArea type="always" data-testid="scroll-area">
        <div style={{ height: 1000 }}>Long Content</div>
        <ScrollBar data-testid="scroll-bar" className="custom-v-bar" />
      </ScrollArea>
    )

    const scrollBars = screen.getAllByTestId('scroll-bar')
    expect(scrollBars.length).toBeGreaterThan(0)
    const bar = scrollBars[0]
    expect(bar.className).toContain('h-full')
    expect(bar.className).toContain('w-2.5')
    expect(bar.className).toContain('border-l')
    expect(bar.className).toContain('custom-v-bar')
    expect(bar.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('renders horizontal scrollbar when orientation prop is horizontal', () => {
    render(
      <ScrollArea type="always" data-testid="scroll-area">
        <div style={{ width: 1000 }}>Wide Content</div>
        <ScrollBar data-testid="scroll-bar-h" orientation="horizontal" className="custom-h-bar" />
      </ScrollArea>
    )

    const scrollBar = screen.getByTestId('scroll-bar-h')
    expect(scrollBar).toBeTruthy()
    expect(scrollBar.className).toContain('h-2.5')
    expect(scrollBar.className).toContain('flex-col')
    expect(scrollBar.className).toContain('border-t')
    expect(scrollBar.className).toContain('custom-h-bar')
    expect(scrollBar.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('forwards ref to ScrollBar element when type="always"', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <ScrollArea type="always">
        <div>Content</div>
        <ScrollBar ref={ref} data-testid="scroll-bar-ref" />
      </ScrollArea>
    )

    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
