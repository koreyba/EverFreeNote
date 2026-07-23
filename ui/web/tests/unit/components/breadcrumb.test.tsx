import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb'

describe('Breadcrumb UI components', () => {
  describe('Breadcrumb', () => {
    it('renders a nav element with aria-label="breadcrumb"', () => {
      render(<Breadcrumb data-testid="nav-breadcrumb">Breadcrumb Content</Breadcrumb>)

      const nav = screen.getByTestId('nav-breadcrumb')
      expect(nav.tagName.toLowerCase()).toBe('nav')
      expect(nav.getAttribute('aria-label')).toBe('breadcrumb')
      expect(nav.textContent).toBe('Breadcrumb Content')
    })

    it('forwards ref and applies custom className', () => {
      const ref = React.createRef<HTMLElement>()
      render(<Breadcrumb ref={ref} className="custom-breadcrumb-class" />)

      expect(ref.current).toBeInstanceOf(HTMLElement)
      expect(ref.current?.classList.contains('custom-breadcrumb-class')).toBe(true)
    })
  })

  describe('BreadcrumbList', () => {
    it('renders an ordered list (<ol>) element', () => {
      render(<BreadcrumbList data-testid="breadcrumb-list">List Content</BreadcrumbList>)

      const ol = screen.getByTestId('breadcrumb-list')
      expect(ol.tagName.toLowerCase()).toBe('ol')
      expect(ol.classList.contains('flex')).toBe(true)
      expect(ol.classList.contains('items-center')).toBe(true)
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLOListElement>()
      render(<BreadcrumbList ref={ref} className="custom-list-class" />)

      expect(ref.current).toBeInstanceOf(HTMLOListElement)
      expect(ref.current?.classList.contains('custom-list-class')).toBe(true)
    })
  })

  describe('BreadcrumbItem', () => {
    it('renders a list item (<li>) element', () => {
      render(<BreadcrumbItem data-testid="breadcrumb-item">Item Content</BreadcrumbItem>)

      const li = screen.getByTestId('breadcrumb-item')
      expect(li.tagName.toLowerCase()).toBe('li')
      expect(li.classList.contains('inline-flex')).toBe(true)
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLLIElement>()
      render(<BreadcrumbItem ref={ref} className="custom-item-class" />)

      expect(ref.current).toBeInstanceOf(HTMLLIElement)
      expect(ref.current?.classList.contains('custom-item-class')).toBe(true)
    })
  })

  describe('BreadcrumbLink', () => {
    it('renders an anchor (<a>) element by default', () => {
      render(
        <BreadcrumbLink href="/docs" data-testid="breadcrumb-link">
          Docs
        </BreadcrumbLink>
      )

      const link = screen.getByTestId('breadcrumb-link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link.getAttribute('href')).toBe('/docs')
      expect(link.textContent).toBe('Docs')
    })

    it('renders child element when asChild is true', () => {
      render(
        <BreadcrumbLink asChild data-testid="breadcrumb-link">
          <button type="button">Custom Button Link</button>
        </BreadcrumbLink>
      )

      const button = screen.getByTestId('breadcrumb-link')
      expect(button.tagName.toLowerCase()).toBe('button')
      expect(button.textContent).toBe('Custom Button Link')
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLAnchorElement>()
      render(<BreadcrumbLink ref={ref} href="#" className="custom-link-class" />)

      expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
      expect(ref.current?.classList.contains('custom-link-class')).toBe(true)
    })
  })

  describe('BreadcrumbPage', () => {
    it('renders a span element with page accessibility attributes', () => {
      render(<BreadcrumbPage data-testid="breadcrumb-page">Current Page</BreadcrumbPage>)

      const page = screen.getByTestId('breadcrumb-page')
      expect(page.tagName.toLowerCase()).toBe('span')
      expect(page.getAttribute('role')).toBe('link')
      expect(page.getAttribute('aria-disabled')).toBe('true')
      expect(page.getAttribute('aria-current')).toBe('page')
      expect(page.textContent).toBe('Current Page')
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLSpanElement>()
      render(<BreadcrumbPage ref={ref} className="custom-page-class" />)

      expect(ref.current).toBeInstanceOf(HTMLSpanElement)
      expect(ref.current?.classList.contains('custom-page-class')).toBe(true)
    })
  })

  describe('BreadcrumbSeparator', () => {
    it('renders a presentation list item with default ChevronRight icon', () => {
      render(<BreadcrumbSeparator data-testid="breadcrumb-separator" />)

      const separator = screen.getByTestId('breadcrumb-separator')
      expect(separator.tagName.toLowerCase()).toBe('li')
      expect(separator.getAttribute('role')).toBe('presentation')
      expect(separator.getAttribute('aria-hidden')).toBe('true')
      const svg = separator.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('renders custom children when provided', () => {
      render(
        <BreadcrumbSeparator data-testid="breadcrumb-separator">
          <span data-testid="custom-sep">/</span>
        </BreadcrumbSeparator>
      )

      const customSep = screen.getByTestId('custom-sep')
      expect(customSep).toBeTruthy()
      expect(customSep.textContent).toBe('/')
    })

    it('applies custom className', () => {
      render(
        <BreadcrumbSeparator data-testid="breadcrumb-separator" className="custom-separator-class" />
      )

      const separator = screen.getByTestId('breadcrumb-separator')
      expect(separator.classList.contains('custom-separator-class')).toBe(true)
    })
  })

  describe('BreadcrumbEllipsis', () => {
    it('renders a presentation span with screen reader text', () => {
      render(<BreadcrumbEllipsis data-testid="breadcrumb-ellipsis" />)

      const ellipsis = screen.getByTestId('breadcrumb-ellipsis')
      expect(ellipsis.tagName.toLowerCase()).toBe('span')
      expect(ellipsis.getAttribute('role')).toBe('presentation')
      expect(ellipsis.getAttribute('aria-hidden')).toBe('true')

      const srText = screen.getByText('More')
      expect(srText).toBeTruthy()
      expect(srText.classList.contains('sr-only')).toBe(true)

      const svg = ellipsis.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('applies custom className', () => {
      render(<BreadcrumbEllipsis data-testid="breadcrumb-ellipsis" className="custom-ellipsis-class" />)

      const ellipsis = screen.getByTestId('breadcrumb-ellipsis')
      expect(ellipsis.classList.contains('custom-ellipsis-class')).toBe(true)
    })
  })

  describe('Full Breadcrumb Composition', () => {
    it('renders a full breadcrumb component hierarchy cleanly', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )

      expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
      expect(screen.getByText('More')).toBeTruthy()
      expect(screen.getByText('Settings')).toBeTruthy()
    })
  })
})
