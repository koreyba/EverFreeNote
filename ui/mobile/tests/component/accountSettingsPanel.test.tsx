import React from 'react'
import { fireEvent, render, screen, act } from '@testing-library/react-native'
import { AccountSettingsPanel } from '../../components/settings/AccountSettingsPanel'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      primary: '#00aa00',
      mutedForeground: '#666666',
      destructive: '#ff0000',
    },
  }),
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    CheckSquare: () => React.createElement(Text, { testID: 'CheckSquare' }, 'CheckSquare'),
    CircleAlert: () => React.createElement(Text, { testID: 'CircleAlert' }, 'CircleAlert'),
    CircleCheckBig: () => React.createElement(Text, { testID: 'CircleCheckBig' }, 'CircleCheckBig'),
    Info: () => React.createElement(Text, { testID: 'Info' }, 'Info'),
    LogOut: () => React.createElement(Text, { testID: 'LogOut' }, 'LogOut'),
    Monitor: () => React.createElement(Text, { testID: 'Monitor' }, 'Monitor'),
    Moon: () => React.createElement(Text, { testID: 'Moon' }, 'Moon'),
    Square: () => React.createElement(Text, { testID: 'Square' }, 'Square'),
    Sun: () => React.createElement(Text, { testID: 'Sun' }, 'Sun'),
    User: () => React.createElement(Text, { testID: 'User' }, 'User'),
  }
})

describe('AccountSettingsPanel', () => {
  const defaultProps = {
    email: 'user@example.com',
    mode: 'system' as const,
    colorScheme: 'light' as const,
    onModeChange: jest.fn(),
    onSignOut: jest.fn(),
    onDeleteAccount: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders email text and theme options (System, Light, Dark)', () => {
    render(<AccountSettingsPanel {...defaultProps} />)

    expect(screen.getByText('user@example.com')).toBeTruthy()
    expect(screen.getByText('System')).toBeTruthy()
    expect(screen.getByText('Light')).toBeTruthy()
    expect(screen.getByText('Dark')).toBeTruthy()
  })

  it('triggers onModeChange when theme buttons are pressed', () => {
    render(<AccountSettingsPanel {...defaultProps} />)

    fireEvent.press(screen.getByText('Dark'))
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('dark')

    fireEvent.press(screen.getByText('Light'))
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('light')
  })

  it('triggers onSignOut when Sign out button is pressed', () => {
    render(<AccountSettingsPanel {...defaultProps} />)

    fireEvent.press(screen.getByText('Sign out'))
    expect(defaultProps.onSignOut).toHaveBeenCalledTimes(1)
  })

  it('disables Delete account button until deletion agreement checkbox is checked', () => {
    render(<AccountSettingsPanel {...defaultProps} />)

    const deleteBtn = screen.getByText('Delete account')
    fireEvent.press(deleteBtn)
    expect(defaultProps.onDeleteAccount).not.toHaveBeenCalled()

    const checkboxLabel = screen.getByText('I understand that my account and all notes will be permanently deleted.')
    fireEvent.press(checkboxLabel)

    fireEvent.press(deleteBtn)
    expect(defaultProps.onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  it('triggers onDeleteAccount when enabled and pressed', async () => {
    render(<AccountSettingsPanel {...defaultProps} />)

    const checkboxLabel = screen.getByText('I understand that my account and all notes will be permanently deleted.')
    fireEvent.press(checkboxLabel)

    const deleteBtn = screen.getByText('Delete account')
    await act(async () => {
      fireEvent.press(deleteBtn)
    })

    expect(defaultProps.onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  it('renders SettingsStatusMessage with error message when onDeleteAccount throws an error', async () => {
    const onDeleteAccountMock = jest.fn().mockRejectedValue(new Error('Failed to delete account from server'))
    render(<AccountSettingsPanel {...defaultProps} onDeleteAccount={onDeleteAccountMock} />)

    const checkboxLabel = screen.getByText('I understand that my account and all notes will be permanently deleted.')
    fireEvent.press(checkboxLabel)

    const deleteBtn = screen.getByText('Delete account')
    await act(async () => {
      fireEvent.press(deleteBtn)
    })

    expect(await screen.findByText('Failed to delete account from server')).toBeTruthy()
  })
})
