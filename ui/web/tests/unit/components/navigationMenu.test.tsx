import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'

describe('NavigationMenu components', () => {
  it('renders NavigationMenu root, list, item, and trigger', () => {
    const { container } = render(
      <NavigationMenu className="custom-menu">
        <NavigationMenuList className="custom-list">
          <NavigationMenuItem className="custom-item">
            <NavigationMenuTrigger className="custom-trigger">
              Getting Started
            </NavigationMenuTrigger>
            <NavigationMenuContent className="custom-content">
              <div>Dropdown Content</div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )

    expect(screen.getByText('Getting Started')).toBeTruthy()
    const trigger = screen.getByText('Getting Started')
    expect(trigger.className).toContain('group inline-flex')
    expect(trigger.className).toContain('custom-trigger')

    const list = container.querySelector('ul')
    expect(list).toBeTruthy()
    expect(list?.className).toContain('custom-list')
  })

  it('renders NavigationMenuLink with navigationMenuTriggerStyle', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()} href="/docs">
              Documentation
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )

    const link = screen.getByText('Documentation')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/docs')

    const chevronIcon = link.querySelector('svg')
    expect(chevronIcon).toBeNull()
  })

  it('renders NavigationMenuTrigger with chevron icon', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu Trigger</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    )

    const trigger = screen.getByText('Menu Trigger')
    expect(trigger).toBeTruthy()
    const svgIcon = container.querySelector('svg')
    expect(svgIcon).toBeTruthy()
    expect(svgIcon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders NavigationMenuViewport and NavigationMenuIndicator', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Test Menu</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div>Menu Content</div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator className="custom-indicator" />
        <NavigationMenuViewport className="custom-viewport" />
      </NavigationMenu>
    )

    const trigger = screen.getByText('Test Menu')
    fireEvent.click(trigger)

    const viewport = container.querySelector('.custom-viewport') || container.querySelector('div.absolute')
    expect(viewport).toBeTruthy()
  })

  it('handles user click on trigger to toggle open state', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Dropdown Menu</NavigationMenuTrigger>
            <NavigationMenuContent>
              <a href="/item-1">Item 1</a>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport />
      </NavigationMenu>
    )

    const trigger = screen.getByText('Dropdown Menu')
    fireEvent.click(trigger)
    expect(screen.getAllByText('Item 1').length).toBeGreaterThan(0)
  })

  it('exports navigationMenuTriggerStyle function returning proper class string', () => {
    const classes = navigationMenuTriggerStyle()
    expect(typeof classes).toBe('string')
    expect(classes).toContain('group inline-flex h-9 w-max items-center justify-center')
  })
})
