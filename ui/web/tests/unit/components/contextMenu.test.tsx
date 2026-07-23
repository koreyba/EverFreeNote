import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from '@/components/ui/context-menu'

describe('ContextMenu UI components', () => {
  it('renders context menu trigger, label, item, shortcut, and separator inside open context menu', () => {
    const handleSelect = jest.fn()

    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="menu-trigger">Right click here</ContextMenuTrigger>
        <ContextMenuContent data-testid="menu-content">
          <ContextMenuGroup>
            <ContextMenuLabel inset className="custom-label">
              Actions
            </ContextMenuLabel>
            <ContextMenuItem inset onSelect={handleSelect} className="custom-item">
              Copy
              <ContextMenuShortcut className="custom-shortcut">⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator className="custom-separator" />
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    )

    const trigger = screen.getByTestId('menu-trigger')
    expect(trigger).toBeTruthy()
    expect(trigger.textContent).toBe('Right click here')

    fireEvent.contextMenu(trigger)

    expect(screen.getByTestId('menu-content')).toBeTruthy()
    expect(screen.getByText('Actions')).toBeTruthy()

    const item = screen.getByText('Copy')
    expect(item).toBeTruthy()
    fireEvent.click(item)
    expect(handleSelect).toHaveBeenCalledTimes(1)
  })

  it('renders checkbox and radio item components', () => {
    const handleCheckedChange = jest.fn()
    const handleValueChange = jest.fn()

    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="menu-trigger-2">Right click</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked={true} onCheckedChange={handleCheckedChange}>
            Show Status Bar
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="dark" onValueChange={handleValueChange}>
            <ContextMenuRadioItem value="light">Light Theme</ContextMenuRadioItem>
            <ContextMenuRadioItem value="dark">Dark Theme</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuContent>
      </ContextMenu>
    )

    fireEvent.contextMenu(screen.getByTestId('menu-trigger-2'))

    const checkboxItem = screen.getByText('Show Status Bar')
    expect(checkboxItem).toBeTruthy()

    const radioItem = screen.getByText('Dark Theme')
    expect(radioItem).toBeTruthy()
  })

  it('renders sub-menu components', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="menu-trigger-3">Right click</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger inset className="custom-subtrigger">
              More Tools
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="custom-subcontent">
              <ContextMenuItem>Developer Tools</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    )

    fireEvent.contextMenu(screen.getByTestId('menu-trigger-3'))

    const subTrigger = screen.getByText('More Tools')
    expect(subTrigger).toBeTruthy()
  })
})
