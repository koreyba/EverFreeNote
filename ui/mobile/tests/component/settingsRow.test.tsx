import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SettingsRow } from '@ui/mobile/components/settings/SettingsRow'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e0e0e0',
      muted: '#f0f0f0',
      foreground: '#000000',
      mutedForeground: '#666666',
    },
  }),
}))

jest.mock('lucide-react-native', () => {
  const React = require('react')
  const { Text } = require('react-native')
  return {
    ChevronRight: () => React.createElement(Text, { testID: 'ChevronRight' }, 'ChevronRight'),
  }
})

describe('SettingsRow', () => {
  it('renders title and optional subtitle', () => {
    render(<SettingsRow title="Account" subtitle="Manage profile" />)

    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('Manage profile')).toBeTruthy()
  })

  it('renders right node passed in props', () => {
    render(
      <SettingsRow
        title="Notifications"
        right={<Text testID="badge">Enabled</Text>}
      />
    )

    expect(screen.getByTestId('badge')).toBeTruthy()
    expect(screen.getByText('Enabled')).toBeTruthy()
  })

  it('invokes onPress when pressed and not disabled', () => {
    const onPress = jest.fn()
    render(<SettingsRow title="Clickable" onPress={onPress} />)

    fireEvent.press(screen.getByText('Clickable'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onPress when disabled is true', () => {
    const onPress = jest.fn()
    render(<SettingsRow title="Disabled" onPress={onPress} disabled={true} />)

    fireEvent.press(screen.getByText('Disabled'))

    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders chevron only when showChevron is true, onPress is provided, and disabled is false', () => {
    const { rerender } = render(<SettingsRow title="Option" onPress={jest.fn()} />)
    expect(screen.queryByTestId('ChevronRight')).toBeTruthy()

    rerender(<SettingsRow title="Option" onPress={jest.fn()} showChevron={false} />)
    expect(screen.queryByTestId('ChevronRight')).toBeNull()

    rerender(<SettingsRow title="Option" showChevron={true} />)
    expect(screen.queryByTestId('ChevronRight')).toBeNull()

    rerender(<SettingsRow title="Option" onPress={jest.fn()} disabled={true} />)
    expect(screen.queryByTestId('ChevronRight')).toBeNull()
  })

  it('applies top rounded corners for isFirst and bottom rounded corners for isLast', () => {
    render(<SettingsRow title="Row" isFirst={true} isLast={true} />)

    const row = screen.getByLabelText('Row')
    const flatStyle = Object.assign({}, ...(Array.isArray(row.props.style) ? row.props.style : [row.props.style]))

    expect(flatStyle.borderTopLeftRadius).toBe(12)
    expect(flatStyle.borderTopRightRadius).toBe(12)
    expect(flatStyle.borderBottomLeftRadius).toBe(12)
    expect(flatStyle.borderBottomRightRadius).toBe(12)
  })
})
