import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

describe('Accordion UI components', () => {
  describe('AccordionItem', () => {
    it('has correct displayName', () => {
      expect(AccordionItem.displayName).toBe('AccordionItem')
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem ref={ref} value="item-1" className="custom-item-class" data-testid="accordion-item">
            <AccordionTrigger>Trigger</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const item = screen.getByTestId('accordion-item')
      expect(item).toBeTruthy()
      expect(item.classList.contains('border-b')).toBe(true)
      expect(item.classList.contains('custom-item-class')).toBe(true)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('AccordionTrigger', () => {
    it('renders trigger button inside header with ChevronDown icon', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger data-testid="accordion-trigger" className="custom-trigger">
              Trigger Title
            </AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const trigger = screen.getByTestId('accordion-trigger')
      expect(trigger).toBeTruthy()
      expect(trigger.textContent).toContain('Trigger Title')
      expect(trigger.classList.contains('custom-trigger')).toBe(true)
      expect(trigger.classList.contains('hover:underline')).toBe(true)

      const svg = trigger.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('forwards ref to trigger element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger ref={ref}>Trigger Ref</AccordionTrigger>
            <AccordionContent>Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('AccordionContent', () => {
    it('renders children and merges custom className on inner container', () => {
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Trigger</AccordionTrigger>
            <AccordionContent data-testid="accordion-content" className="custom-content-class">
              Inner Content Text
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const content = screen.getByTestId('accordion-content')
      expect(content).toBeTruthy()
      expect(screen.getByText('Inner Content Text')).toBeTruthy()

      const innerDiv = screen.getByText('Inner Content Text')
      expect(innerDiv.classList.contains('pb-4')).toBe(true)
      expect(innerDiv.classList.contains('pt-0')).toBe(true)
      expect(innerDiv.classList.contains('custom-content-class')).toBe(true)
    })

    it('forwards ref to content element', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Trigger</AccordionTrigger>
            <AccordionContent ref={ref}>Content Ref</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('Accordion Full Interaction', () => {
    it('expands and collapses item content on trigger click', () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1 Trigger</AccordionTrigger>
            <AccordionContent>Item 1 Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const trigger = screen.getByRole('button', { name: /Item 1 Trigger/i })

      expect(trigger.getAttribute('data-state')).toBe('closed')

      fireEvent.click(trigger)
      expect(trigger.getAttribute('data-state')).toBe('open')
      expect(screen.getByText('Item 1 Content')).toBeTruthy()

      fireEvent.click(trigger)
      expect(trigger.getAttribute('data-state')).toBe('closed')
    })

    it('handles multiple open items when type="multiple"', () => {
      render(
        <Accordion type="multiple" defaultValue={['item-1']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Item 1 Trigger</AccordionTrigger>
            <AccordionContent>Item 1 Content</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Item 2 Trigger</AccordionTrigger>
            <AccordionContent>Item 2 Content</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const trigger1 = screen.getByRole('button', { name: /Item 1 Trigger/i })
      const trigger2 = screen.getByRole('button', { name: /Item 2 Trigger/i })

      expect(trigger1.getAttribute('data-state')).toBe('open')
      expect(trigger2.getAttribute('data-state')).toBe('closed')

      fireEvent.click(trigger2)

      expect(trigger1.getAttribute('data-state')).toBe('open')
      expect(trigger2.getAttribute('data-state')).toBe('open')
    })
  })
})
