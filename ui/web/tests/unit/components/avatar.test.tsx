import React from 'react'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

describe('Avatar UI components', () => {
  describe('Avatar Root', () => {
    it('renders root span with default styles and merges custom className', () => {
      const { container } = render(
        <Avatar className="custom-avatar-class" data-testid="avatar-root">
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      )

      const root = screen.getByTestId('avatar-root')
      expect(root).toBeTruthy()
      expect(root.className).toContain('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full')
      expect(root.className).toContain('custom-avatar-class')
    })

    it('forwards ref to root element', () => {
      const ref = React.createRef<HTMLSpanElement>()
      render(
        <Avatar ref={ref}>
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      )

      expect(ref.current).toBeTruthy()
    })
  })

  describe('AvatarFallback', () => {
    it('renders fallback text with default flex styles and custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback-class" data-testid="avatar-fallback">
            JD
          </AvatarFallback>
        </Avatar>
      )

      const fallback = screen.getByTestId('avatar-fallback')
      expect(fallback).toBeTruthy()
      expect(fallback.textContent).toBe('JD')
      expect(fallback.className).toContain('flex h-full w-full items-center justify-center rounded-full bg-muted')
      expect(fallback.className).toContain('custom-fallback-class')
    })

    it('forwards ref to fallback element', () => {
      const ref = React.createRef<HTMLSpanElement>()
      render(
        <Avatar>
          <AvatarFallback ref={ref}>JD</AvatarFallback>
        </Avatar>
      )

      expect(ref.current).toBeTruthy()
    })
  })

  describe('AvatarImage', () => {
    it('renders image component inside avatar', () => {
      const { container } = render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.png" alt="User Avatar" className="custom-img-class" />
          <AvatarFallback>UA</AvatarFallback>
        </Avatar>
      )

      expect(container.querySelector('span')).toBeTruthy()
    })

    it('forwards ref to image element', () => {
      const ref = React.createRef<HTMLImageElement>()
      render(
        <Avatar>
          <AvatarImage ref={ref} src="https://example.com/avatar.png" alt="User Avatar" />
        </Avatar>
      )

      expect(ref).toBeTruthy()
    })
  })
})
