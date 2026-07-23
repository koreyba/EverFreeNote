import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

describe('Command Component', () => {
  it('renders Command root with custom className and forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <Command ref={ref} className="custom-command-class">
        <div data-testid="command-content">Inside Command</div>
      </Command>
    )

    expect(ref.current).toBeTruthy()
    expect(ref.current?.classList.contains('custom-command-class')).toBe(true)
    expect(ref.current?.classList.contains('flex')).toBe(true)
    expect(screen.getByTestId('command-content')).toBeTruthy()
  })

  it('renders CommandInput with search icon, placeholder and forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(
      <Command>
        <CommandInput ref={ref} placeholder="Search options..." className="custom-input-class" />
      </Command>
    )

    expect(ref.current).toBeTruthy()
    const input = screen.getByPlaceholderText('Search options...')
    expect(input).toBeTruthy()
    expect(input.classList.contains('custom-input-class')).toBe(true)

    fireEvent.change(input, { target: { value: 'query' } })
    expect((input as HTMLInputElement).value).toBe('query')
  })

  it('renders CommandList, CommandGroup, CommandItem, CommandShortcut and CommandSeparator', () => {
    const handleSelect = jest.fn()
    const listRef = React.createRef<HTMLDivElement>()
    const emptyRef = React.createRef<HTMLDivElement>()
    const groupRef = React.createRef<HTMLDivElement>()
    const itemRef = React.createRef<HTMLDivElement>()
    const sepRef = React.createRef<HTMLDivElement>()

    render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList ref={listRef} className="custom-list">
          <CommandEmpty ref={emptyRef} className="custom-empty">
            No items
          </CommandEmpty>
          <CommandGroup ref={groupRef} heading="Actions" className="custom-group">
            <CommandItem ref={itemRef} onSelect={handleSelect} className="custom-item">
              <span>Open Document</span>
              <CommandShortcut className="custom-shortcut">⌘O</CommandShortcut>
            </CommandItem>
            <CommandSeparator ref={sepRef} className="custom-sep" />
            <CommandItem>
              <span>Save Document</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )

    expect(listRef.current).toBeTruthy()
    expect(groupRef.current).toBeTruthy()
    expect(itemRef.current).toBeTruthy()
    expect(sepRef.current).toBeTruthy()

    expect(screen.getByText('Open Document')).toBeTruthy()
    expect(screen.getByText('Save Document')).toBeTruthy()

    const shortcut = screen.getByText('⌘O')
    expect(shortcut).toBeTruthy()
    expect(shortcut.classList.contains('custom-shortcut')).toBe(true)
  })
})
