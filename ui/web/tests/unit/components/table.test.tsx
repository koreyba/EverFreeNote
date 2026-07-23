import React from 'react'
import { render, screen } from '@testing-library/react'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

describe('Table UI components', () => {
  it('renders complete table structure with all subcomponents', () => {
    render(
      <Table data-testid="table-wrapper">
        <TableCaption>Invoice Summary</TableCaption>
        <TableHeader data-testid="table-header">
          <TableRow data-testid="header-row">
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody data-testid="table-body">
          <TableRow data-testid="body-row-1">
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>$250.00</TableCell>
          </TableRow>
          <TableRow data-testid="body-row-2" data-state="selected">
            <TableCell>INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>$150.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter data-testid="table-footer">
          <TableRow data-testid="footer-row">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell>$400.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    // Check table elements in DOM
    const table = screen.getByRole('table')
    expect(table).toBeTruthy()
    expect(table.className).toContain('w-full')
    expect(table.className).toContain('caption-bottom')
    expect(table.className).toContain('text-sm')

    // Check wrapper container class
    const tableWrapper = screen.getByTestId('table-wrapper').parentElement
    expect(tableWrapper).toBeTruthy()
    expect(tableWrapper?.className).toContain('relative')
    expect(tableWrapper?.className).toContain('w-full')
    expect(tableWrapper?.className).toContain('overflow-auto')

    // Caption
    const caption = screen.getByText('Invoice Summary')
    expect(caption.tagName.toLowerCase()).toBe('caption')
    expect(caption.className).toContain('mt-4')
    expect(caption.className).toContain('text-sm')
    expect(caption.className).toContain('text-muted-foreground')

    // Header
    const header = screen.getByTestId('table-header')
    expect(header.tagName.toLowerCase()).toBe('thead')
    expect(header.className).toContain('[&_tr]:border-b')

    // Body
    const body = screen.getByTestId('table-body')
    expect(body.tagName.toLowerCase()).toBe('tbody')
    expect(body.className).toContain('[&_tr:last-child]:border-0')

    // Rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4) // 1 header + 2 body + 1 footer

    const selectedRow = screen.getByTestId('body-row-2')
    expect(selectedRow.getAttribute('data-state')).toBe('selected')

    // TableHead
    const ths = screen.getAllByRole('columnheader')
    expect(ths).toHaveLength(3)
    expect(ths[0].textContent).toBe('Invoice')
    expect(ths[0].className).toContain('h-10')
    expect(ths[0].className).toContain('px-2')
    expect(ths[0].className).toContain('text-left')

    // TableCell
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBeGreaterThan(0)
    expect(cells[0].textContent).toBe('INV001')
    expect(cells[0].className).toContain('p-2')
    expect(cells[0].className).toContain('align-middle')

    // Footer
    const footer = screen.getByTestId('table-footer')
    expect(footer.tagName.toLowerCase()).toBe('tfoot')
    expect(footer.className).toContain('bg-primary')
    expect(footer.className).toContain('text-primary-foreground')
  })

  it('merges custom classNames correctly on all subcomponents', () => {
    render(
      <Table className="custom-table" data-testid="table">
        <TableCaption className="custom-caption">Caption</TableCaption>
        <TableHeader className="custom-header" data-testid="header">
          <TableRow className="custom-row" data-testid="row">
            <TableHead className="custom-head" data-testid="head">
              Header Cell
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="custom-body" data-testid="body">
          <TableRow>
            <TableCell className="custom-cell" data-testid="cell">
              Body Cell
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter className="custom-footer" data-testid="footer">
          <TableRow>
            <TableCell colSpan={1}>Footer Cell</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByTestId('table').className).toContain('custom-table')
    expect(screen.getByTestId('table').className).toContain('w-full')

    expect(screen.getByText('Caption').className).toContain('custom-caption')
    expect(screen.getByText('Caption').className).toContain('mt-4')

    expect(screen.getByTestId('header').className).toContain('custom-header')
    expect(screen.getByTestId('header').className).toContain('[&_tr]:border-b')

    expect(screen.getByTestId('body').className).toContain('custom-body')
    expect(screen.getByTestId('body').className).toContain('[&_tr:last-child]:border-0')

    expect(screen.getByTestId('footer').className).toContain('custom-footer')
    expect(screen.getByTestId('footer').className).toContain('bg-primary')

    expect(screen.getByTestId('row').className).toContain('custom-row')
    expect(screen.getByTestId('row').className).toContain('border-b')

    expect(screen.getByTestId('head').className).toContain('custom-head')
    expect(screen.getByTestId('head').className).toContain('h-10')

    expect(screen.getByTestId('cell').className).toContain('custom-cell')
    expect(screen.getByTestId('cell').className).toContain('p-2')
  })

  it('forwards refs correctly to DOM elements of all components', () => {
    const tableRef = React.createRef<HTMLTableElement>()
    const headerRef = React.createRef<HTMLTableSectionElement>()
    const bodyRef = React.createRef<HTMLTableSectionElement>()
    const footerRef = React.createRef<HTMLTableSectionElement>()
    const rowRef = React.createRef<HTMLTableRowElement>()
    const headRef = React.createRef<HTMLTableCellElement>()
    const cellRef = React.createRef<HTMLTableCellElement>()
    const captionRef = React.createRef<HTMLTableCaptionElement>()

    render(
      <Table ref={tableRef}>
        <TableCaption ref={captionRef}>Caption Ref</TableCaption>
        <TableHeader ref={headerRef}>
          <TableRow ref={rowRef}>
            <TableHead ref={headRef}>Head Ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={bodyRef}>
          <TableRow>
            <TableCell ref={cellRef}>Cell Ref</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter ref={footerRef}>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(tableRef.current).toBeInstanceOf(HTMLTableElement)
    expect(headerRef.current).toBeInstanceOf(HTMLTableSectionElement)
    expect(bodyRef.current).toBeInstanceOf(HTMLTableSectionElement)
    expect(footerRef.current).toBeInstanceOf(HTMLTableSectionElement)
    expect(rowRef.current).toBeInstanceOf(HTMLTableRowElement)
    expect(headRef.current).toBeInstanceOf(HTMLTableCellElement)
    expect(cellRef.current).toBeInstanceOf(HTMLTableCellElement)
    expect(captionRef.current).toBeInstanceOf(HTMLTableCaptionElement)
  })
})
