import React from 'react'
import { View } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import type { ToastConfigParams } from 'react-native-toast-message'
import { SnackbarToast } from '@ui/mobile/components/SnackbarToast'

const mockColors = {
  foreground: '#1f2937',
  background: '#ffffff',
  destructive: '#ef4444',
  destructiveForeground: '#fef2f2',
}

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: mockColors,
  }),
}))

describe('SnackbarToast', () => {
  it('renders text1 message string passed in props', () => {
    const props = {
      text1: 'Note saved successfully',
      type: 'success',
    } as ToastConfigParams<unknown>

    render(<SnackbarToast {...props} />)

    expect(screen.getByText('Note saved successfully')).toBeTruthy()
  })

  it('renders with default foreground background color and background text color when type !== "error"', () => {
    const props = {
      text1: 'Info notification',
      type: 'info',
    } as ToastConfigParams<unknown>

    render(<SnackbarToast {...props} />)

    const textElement = screen.getByText('Info notification')
    const viewElement = screen.UNSAFE_getByType(View)

    expect(textElement.props.style).toEqual(
      expect.arrayContaining([{ color: mockColors.background }])
    )
    expect(viewElement.props.style).toEqual(
      expect.arrayContaining([{ backgroundColor: mockColors.foreground }])
    )
  })

  it('renders with destructive background color and destructiveForeground text color when type === "error"', () => {
    const props = {
      text1: 'Failed to save note',
      type: 'error',
    } as ToastConfigParams<unknown>

    render(<SnackbarToast {...props} />)

    const textElement = screen.getByText('Failed to save note')
    const viewElement = screen.UNSAFE_getByType(View)

    expect(textElement.props.style).toEqual(
      expect.arrayContaining([{ color: mockColors.destructiveForeground }])
    )
    expect(viewElement.props.style).toEqual(
      expect.arrayContaining([{ backgroundColor: mockColors.destructive }])
    )
  })

  it('defaults to non-error colors when type is omitted or undefined', () => {
    const props = {
      text1: 'Default message',
    } as ToastConfigParams<unknown>

    render(<SnackbarToast {...props} />)

    const textElement = screen.getByText('Default message')
    const viewElement = screen.UNSAFE_getByType(View)

    expect(textElement.props.style).toEqual(
      expect.arrayContaining([{ color: mockColors.background }])
    )
    expect(viewElement.props.style).toEqual(
      expect.arrayContaining([{ backgroundColor: mockColors.foreground }])
    )
  })
})
