import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerOverlay,
} from '@/components/ui/drawer'

describe('Drawer components', () => {
  it('renders DrawerHeader with custom and default class names', () => {
    const { container } = render(
      <DrawerHeader className="custom-header" data-testid="drawer-header">
        Header Content
      </DrawerHeader>
    )
    const header = screen.getByTestId('drawer-header')
    expect(header).toBeTruthy()
    expect(header.textContent).toContain('Header Content')
    expect(header.className).toContain('grid gap-1.5 p-4 text-center sm:text-left')
    expect(header.className).toContain('custom-header')
  })

  it('renders DrawerFooter with custom and default class names', () => {
    render(
      <DrawerFooter className="custom-footer" data-testid="drawer-footer">
        Footer Content
      </DrawerFooter>
    )
    const footer = screen.getByTestId('drawer-footer')
    expect(footer).toBeTruthy()
    expect(footer.textContent).toContain('Footer Content')
    expect(footer.className).toContain('mt-auto flex flex-col gap-2 p-4')
    expect(footer.className).toContain('custom-footer')
  })

  it('renders open Drawer with content, title, and description', () => {
    render(
      <Drawer open>
        <DrawerTrigger>Open Drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer Description</DrawerDescription>
          </DrawerHeader>
          <div>Main content inside drawer</div>
          <DrawerFooter>
            <DrawerClose>Close Drawer</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )

    expect(screen.getByText('Drawer Title')).toBeTruthy()
    expect(screen.getByText('Drawer Description')).toBeTruthy()
    expect(screen.getByText('Main content inside drawer')).toBeTruthy()
    expect(screen.getByText('Close Drawer')).toBeTruthy()
  })

  it('forwards ref and merges className for DrawerOverlay', () => {
    const overlayRef = React.createRef<HTMLDivElement>()
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerOverlay ref={overlayRef} className="custom-overlay" data-testid="drawer-overlay" />
        </DrawerContent>
      </Drawer>
    )

    const overlay = screen.getByTestId('drawer-overlay')
    expect(overlay).toBeTruthy()
    expect(overlay.className).toContain('fixed inset-0 z-50 bg-black/80')
    expect(overlay.className).toContain('custom-overlay')
    expect(overlayRef.current).toBe(overlay)
  })

  it('passes shouldScaleBackground prop to Drawer Root', () => {
    const { container } = render(
      <Drawer shouldScaleBackground={true}>
        <div>Drawer Child</div>
      </Drawer>
    )
    expect(container).toBeTruthy()
  })
})
