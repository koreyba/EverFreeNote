import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination'

describe('Pagination UI components', () => {
  describe('Pagination', () => {
    it('renders a nav element with aria-label="pagination"', () => {
      render(<Pagination data-testid="pagination-nav">Pagination Content</Pagination>)

      const nav = screen.getByTestId('pagination-nav')
      expect(nav.tagName.toLowerCase()).toBe('nav')
      expect(nav.getAttribute('role')).toBe('navigation')
      expect(nav.getAttribute('aria-label')).toBe('pagination')
      expect(nav.textContent).toBe('Pagination Content')
    })

    it('merges custom className with default styles', () => {
      render(<Pagination data-testid="pagination-nav" className="custom-pagination" />)

      const nav = screen.getByTestId('pagination-nav')
      expect(nav.classList.contains('custom-pagination')).toBe(true)
      expect(nav.classList.contains('justify-center')).toBe(true)
    })
  })

  describe('PaginationContent', () => {
    it('renders an unordered list (<ul>) element', () => {
      render(<PaginationContent data-testid="pagination-content">Content</PaginationContent>)

      const ul = screen.getByTestId('pagination-content')
      expect(ul.tagName.toLowerCase()).toBe('ul')
      expect(ul.classList.contains('flex')).toBe(true)
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLUListElement>()
      render(<PaginationContent ref={ref} className="custom-content-class" />)

      expect(ref.current).toBeInstanceOf(HTMLUListElement)
      expect(ref.current?.classList.contains('custom-content-class')).toBe(true)
    })
  })

  describe('PaginationItem', () => {
    it('renders a list item (<li>) element', () => {
      render(<PaginationItem data-testid="pagination-item">Item</PaginationItem>)

      const li = screen.getByTestId('pagination-item')
      expect(li.tagName.toLowerCase()).toBe('li')
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLLIElement>()
      render(<PaginationItem ref={ref} className="custom-item-class" />)

      expect(ref.current).toBeInstanceOf(HTMLLIElement)
      expect(ref.current?.classList.contains('custom-item-class')).toBe(true)
    })
  })

  describe('PaginationLink', () => {
    it('renders an anchor (<a>) element with href', () => {
      render(
        <PaginationLink href="/page/2" data-testid="pagination-link">
          2
        </PaginationLink>
      )

      const link = screen.getByTestId('pagination-link')
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link.getAttribute('href')).toBe('/page/2')
      expect(link.textContent).toBe('2')
      expect(link.getAttribute('aria-current')).toBeNull()
    })

    it('sets aria-current="page" when isActive is true', () => {
      render(
        <PaginationLink href="/page/1" isActive data-testid="pagination-link">
          1
        </PaginationLink>
      )

      const link = screen.getByTestId('pagination-link')
      expect(link.getAttribute('aria-current')).toBe('page')
    })

    it('handles click events', () => {
      const handleClick = jest.fn()
      render(
        <PaginationLink href="#" onClick={handleClick} data-testid="pagination-link">
          1
        </PaginationLink>
      )

      fireEvent.click(screen.getByTestId('pagination-link'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('merges custom className', () => {
      render(
        <PaginationLink href="#" className="custom-link-class" data-testid="pagination-link">
          1
        </PaginationLink>
      )

      const link = screen.getByTestId('pagination-link')
      expect(link.classList.contains('custom-link-class')).toBe(true)
    })
  })

  describe('PaginationPrevious', () => {
    it('renders a previous page link with correct aria-label and text', () => {
      render(<PaginationPrevious href="/page/1" data-testid="pagination-prev" />)

      const prevLink = screen.getByTestId('pagination-prev')
      expect(prevLink.tagName.toLowerCase()).toBe('a')
      expect(prevLink.getAttribute('aria-label')).toBe('Go to previous page')
      expect(prevLink.textContent).toContain('Previous')
      expect(prevLink.querySelector('svg')).toBeTruthy()
    })

    it('merges custom className', () => {
      render(<PaginationPrevious href="/page/1" className="custom-prev" data-testid="pagination-prev" />)

      const prevLink = screen.getByTestId('pagination-prev')
      expect(prevLink.classList.contains('custom-prev')).toBe(true)
    })
  })

  describe('PaginationNext', () => {
    it('renders a next page link with correct aria-label and text', () => {
      render(<PaginationNext href="/page/3" data-testid="pagination-next" />)

      const nextLink = screen.getByTestId('pagination-next')
      expect(nextLink.tagName.toLowerCase()).toBe('a')
      expect(nextLink.getAttribute('aria-label')).toBe('Go to next page')
      expect(nextLink.textContent).toContain('Next')
      expect(nextLink.querySelector('svg')).toBeTruthy()
    })

    it('merges custom className', () => {
      render(<PaginationNext href="/page/3" className="custom-next" data-testid="pagination-next" />)

      const nextLink = screen.getByTestId('pagination-next')
      expect(nextLink.classList.contains('custom-next')).toBe(true)
    })
  })

  describe('PaginationEllipsis', () => {
    it('renders a span with aria-hidden and sr-only text', () => {
      render(<PaginationEllipsis data-testid="pagination-ellipsis" />)

      const ellipsis = screen.getByTestId('pagination-ellipsis')
      expect(ellipsis.tagName.toLowerCase()).toBe('span')
      expect(ellipsis.getAttribute('aria-hidden')).toBe('true')

      const srText = screen.getByText('More pages')
      expect(srText).toBeTruthy()
      expect(srText.classList.contains('sr-only')).toBe(true)
      expect(ellipsis.querySelector('svg')).toBeTruthy()
    })

    it('merges custom className', () => {
      render(<PaginationEllipsis data-testid="pagination-ellipsis" className="custom-ellipsis" />)

      const ellipsis = screen.getByTestId('pagination-ellipsis')
      expect(ellipsis.classList.contains('custom-ellipsis')).toBe(true)
    })
  })

  describe('Full Pagination Composition', () => {
    it('renders complete pagination component structure cleanly', () => {
      render(
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="/page/1" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="/page/1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="/page/2" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="/page/3" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )

      expect(screen.getByRole('navigation', { name: 'pagination' })).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeTruthy()
      expect(screen.getByRole('link', { name: '1' })).toBeTruthy()
      expect(screen.getByRole('link', { name: '2' })).toBeTruthy()
      expect(screen.getByText('More pages')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Go to next page' })).toBeTruthy()
    })
  })
})
