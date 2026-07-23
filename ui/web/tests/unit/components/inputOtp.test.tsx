import React from 'react'
import { render, screen } from '@testing-library/react'
import { OTPInputContext } from 'input-otp'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

describe('InputOTP UI components', () => {
  describe('InputOTP', () => {
    it('renders OTPInput with custom className', () => {
      render(
        <InputOTP
          maxLength={6}
          data-testid="input-otp-root"
          className="custom-input"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = screen.getByTestId('input-otp-root')
      expect(input).toBeTruthy()
      expect(input.className).toContain('custom-input')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(
        <InputOTP ref={ref} maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('InputOTPGroup', () => {
    it('renders a div element with flex layout', () => {
      render(<InputOTPGroup data-testid="otp-group">Group Content</InputOTPGroup>)

      const group = screen.getByTestId('otp-group')
      expect(group.tagName.toLowerCase()).toBe('div')
      expect(group.classList.contains('flex')).toBe(true)
      expect(group.classList.contains('items-center')).toBe(true)
      expect(group.textContent).toBe('Group Content')
    })

    it('forwards ref and merges custom className', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<InputOTPGroup ref={ref} className="custom-group-class" />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.classList.contains('custom-group-class')).toBe(true)
    })
  })

  describe('InputOTPSlot', () => {
    it('renders slot correctly when inside OTPInputContext', () => {
      const mockContextValue = {
        slots: [{ char: '', hasFakeCaret: false, isActive: false }],
        isFocused: false,
        isHovered: false,
      } as unknown as React.ComponentProps<typeof OTPInputContext.Provider>['value']

      render(
        <OTPInputContext.Provider value={mockContextValue}>
          <InputOTPSlot index={0} data-testid="otp-slot-0" />
        </OTPInputContext.Provider>
      )

      const slot = screen.getByTestId('otp-slot-0')
      expect(slot.tagName.toLowerCase()).toBe('div')
      expect(slot.textContent).toBe('')
    })

    it('forwards ref and merges custom className inside context', () => {
      const ref = React.createRef<HTMLDivElement>()
      const mockContextValue = {
        slots: [{ char: '', hasFakeCaret: false, isActive: false }],
        isFocused: false,
        isHovered: false,
      } as unknown as React.ComponentProps<typeof OTPInputContext.Provider>['value']

      render(
        <OTPInputContext.Provider value={mockContextValue}>
          <InputOTPSlot ref={ref} index={0} className="custom-slot-class" />
        </OTPInputContext.Provider>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.classList.contains('custom-slot-class')).toBe(true)
    })

    it('renders character and active styles from OTPInputContext', () => {
      const mockContextValue = {
        slots: [
          { char: 'A', hasFakeCaret: false, isActive: true },
          { char: 'B', hasFakeCaret: true, isActive: false },
        ],
        isFocused: true,
        isHovered: false,
      } as unknown as React.ComponentProps<typeof OTPInputContext.Provider>['value']

      render(
        <OTPInputContext.Provider value={mockContextValue}>
          <InputOTPSlot index={0} data-testid="slot-active" />
          <InputOTPSlot index={1} data-testid="slot-caret" />
        </OTPInputContext.Provider>
      )

      const slotActive = screen.getByTestId('slot-active')
      expect(slotActive.textContent).toBe('A')
      expect(slotActive.classList.contains('ring-1')).toBe(true)
      expect(slotActive.classList.contains('ring-ring')).toBe(true)

      const slotCaret = screen.getByTestId('slot-caret')
      expect(slotCaret.textContent).toBe('B')
      const caretElement = slotCaret.querySelector('.animate-caret-blink')
      expect(caretElement).toBeTruthy()
    })
  })

  describe('InputOTPSeparator', () => {
    it('renders a separator element with Minus icon', () => {
      render(<InputOTPSeparator data-testid="otp-separator" />)

      const separator = screen.getByTestId('otp-separator')
      expect(separator.tagName.toLowerCase()).toBe('div')
      expect(separator.getAttribute('role')).toBe('separator')

      const svg = separator.querySelector('svg')
      expect(svg).toBeTruthy()
    })

    it('forwards ref and passes custom attributes', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<InputOTPSeparator ref={ref} className="custom-separator" />)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.classList.contains('custom-separator')).toBe(true)
    })
  })

  describe('Full InputOTP Composition', () => {
    it('renders full OTP input structure with slots and separator', () => {
      render(
        <InputOTP maxLength={6} data-testid="otp-root" value="123">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator data-testid="otp-sep" />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      )

      expect(screen.getByTestId('otp-root')).toBeTruthy()
      expect(screen.getByTestId('otp-sep')).toBeTruthy()
    })
  })
})
