import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '@/components/ui/toast'

describe('Toast components', () => {
  it('renders ToastViewport with custom and default className', () => {
    render(
      <ToastProvider>
        <ToastViewport className="custom-viewport" data-testid="toast-viewport" />
      </ToastProvider>
    )

    const viewport = screen.getByTestId('toast-viewport')
    expect(viewport).not.toBeNull()
    expect(viewport.className).toContain('fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse')
    expect(viewport.className).toContain('custom-viewport')
  })

  it('renders Toast, ToastTitle, ToastDescription, ToastClose, and ToastAction', () => {
    const handleAction = jest.fn()

    render(
      <ToastProvider>
        <Toast data-testid="toast-item">
          <ToastTitle>Notification Title</ToastTitle>
          <ToastDescription>Notification Description</ToastDescription>
          <ToastAction altText="Undo action" onClick={handleAction}>
            Undo
          </ToastAction>
          <ToastClose data-testid="toast-close" />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Notification Title')).not.toBeNull()
    expect(screen.getByText('Notification Description')).not.toBeNull()

    const actionBtn = screen.getByText('Undo')
    expect(actionBtn).not.toBeNull()

    fireEvent.click(actionBtn)
    expect(handleAction).toHaveBeenCalledTimes(1)

    const closeBtn = screen.getByTestId('toast-close')
    expect(closeBtn).not.toBeNull()
  })

  it('renders Toast with destructive variant styling', () => {
    render(
      <ToastProvider>
        <Toast variant="destructive" data-testid="destructive-toast">
          <ToastTitle>Error Title</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    const toast = screen.getByTestId('destructive-toast')
    expect(toast.className).toContain('destructive group border-destructive bg-destructive text-destructive-foreground')
  })

  it('forwards ref for ToastTitle and ToastDescription', () => {
    const titleRef = React.createRef<HTMLDivElement>()
    const descRef = React.createRef<HTMLDivElement>()

    render(
      <ToastProvider>
        <Toast>
          <ToastTitle ref={titleRef}>Ref Title</ToastTitle>
          <ToastDescription ref={descRef}>Ref Description</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(titleRef.current).not.toBeNull()
    expect(titleRef.current?.textContent).toBe('Ref Title')
    expect(descRef.current).not.toBeNull()
    expect(descRef.current?.textContent).toBe('Ref Description')
  })
})
