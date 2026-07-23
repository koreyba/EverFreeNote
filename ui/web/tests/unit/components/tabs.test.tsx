import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs UI components', () => {
  describe('Component Display Names & Basic Structure', () => {
    it('sets correct displayNames for subcomponents', () => {
      expect(TabsList.displayName).toBeDefined()
      expect(TabsTrigger.displayName).toBeDefined()
      expect(TabsContent.displayName).toBeDefined()
    })
  })

  describe('TabsList', () => {
    it('renders with default class names and merges custom className', () => {
      render(
        <Tabs defaultValue="account">
          <TabsList data-testid="tabs-list" className="custom-list-class">
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const tabsList = screen.getByTestId('tabs-list')
      expect(tabsList).toBeTruthy()
      expect(tabsList.classList.contains('inline-flex')).toBe(true)
      expect(tabsList.classList.contains('bg-muted')).toBe(true)
      expect(tabsList.classList.contains('custom-list-class')).toBe(true)
    })

    it('forwards ref to the HTML element', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Tabs defaultValue="account">
          <TabsList ref={ref}>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
        </Tabs>
      )

      expect(ref.current).not.toBeNull()
      expect(ref.current?.tagName).toBe('DIV')
    })
  })

  describe('TabsTrigger', () => {
    it('renders with default class names and merges custom className', () => {
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account" className="custom-trigger-class" data-testid="trigger-account">
              Account
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      const trigger = screen.getByTestId('trigger-account')
      expect(trigger).toBeTruthy()
      expect(trigger.classList.contains('inline-flex')).toBe(true)
      expect(trigger.classList.contains('custom-trigger-class')).toBe(true)
    })

    it('forwards ref to the button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger ref={ref} value="account">
              Account
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )

      expect(ref.current).not.toBeNull()
      expect(ref.current?.tagName).toBe('BUTTON')
    })
  })

  describe('TabsContent', () => {
    it('renders active content with default class names and merges custom className', () => {
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          <TabsContent value="account" data-testid="content-account" className="custom-content-class">
            Account Content
          </TabsContent>
        </Tabs>
      )

      const content = screen.getByTestId('content-account')
      expect(content).toBeTruthy()
      expect(content.classList.contains('mt-2')).toBe(true)
      expect(content.classList.contains('custom-content-class')).toBe(true)
      expect(content.textContent).toBe('Account Content')
    })

    it('forwards ref to the content element', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          <TabsContent ref={ref} value="account">
            Account Content
          </TabsContent>
        </Tabs>
      )

      expect(ref.current).not.toBeNull()
    })
  })

  describe('Tabs Interaction and Behavior', () => {
    it('switches content when tabs are clicked', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const tab1Trigger = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2Trigger = screen.getByRole('tab', { name: 'Tab 2' })

      expect(tab1Trigger.getAttribute('data-state')).toBe('active')
      expect(tab2Trigger.getAttribute('data-state')).toBe('inactive')
      expect(screen.getByText('Content 1')).toBeTruthy()
      expect(screen.queryByText('Content 2')).toBeNull()

      fireEvent.mouseDown(tab2Trigger, { button: 0 })
      fireEvent.click(tab2Trigger)

      expect(tab1Trigger.getAttribute('data-state')).toBe('inactive')
      expect(tab2Trigger.getAttribute('data-state')).toBe('active')
      expect(screen.queryByText('Content 1')).toBeNull()
      expect(screen.getByText('Content 2')).toBeTruthy()
    })

    it('supports controlled value and onValueChange callback', () => {
      const handleValueChange = jest.fn()
      render(
        <Tabs value="tab1" onValueChange={handleValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const tab2Trigger = screen.getByRole('tab', { name: 'Tab 2' })
      fireEvent.mouseDown(tab2Trigger, { button: 0 })
      fireEvent.click(tab2Trigger)

      expect(handleValueChange).toHaveBeenCalledWith('tab2')
    })

    it('does not trigger change when clicking a disabled tab', () => {
      const handleValueChange = jest.fn()
      render(
        <Tabs defaultValue="tab1" onValueChange={handleValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Tab 2 (Disabled)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const disabledTab = screen.getByRole('tab', { name: 'Tab 2 (Disabled)' }) as HTMLButtonElement
      expect(disabledTab.hasAttribute('disabled')).toBe(true)

      fireEvent.mouseDown(disabledTab, { button: 0 })
      fireEvent.click(disabledTab)
      expect(handleValueChange).not.toHaveBeenCalled()
    })
  })
})
