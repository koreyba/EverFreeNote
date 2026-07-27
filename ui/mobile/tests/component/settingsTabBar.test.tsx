import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import {
  SettingsTabBar,
  type SettingsTabDefinition,
  type SettingsTabKey,
} from '@ui/mobile/components/settings/SettingsTabBar'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      card: '#111111',
      border: '#222222',
      selectionBackground: '#333333',
      selectionBorder: '#444444',
      mutedForeground: '#888888',
      selectionForeground: '#ffffff',
    },
  }),
}))

const mockTabs: SettingsTabDefinition[] = [
  { key: 'account', label: 'Account' },
  { key: 'import', label: 'Import' },
  { key: 'export', label: 'Export' },
]

describe('SettingsTabBar', () => {
  it('renders tab buttons for each tab in tabs array', () => {
    render(
      <SettingsTabBar tabs={mockTabs} activeTab="account" onChange={jest.fn()} />
    )

    expect(screen.getByText('Account')).toBeTruthy()
    expect(screen.getByText('Import')).toBeTruthy()
    expect(screen.getByText('Export')).toBeTruthy()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })

  it('applies active selection styling for the tab matching activeTab', () => {
    render(
      <SettingsTabBar tabs={mockTabs} activeTab="import" onChange={jest.fn()} />
    )

    const activeTabButton = screen.getByLabelText('Import')
    expect(activeTabButton.props.accessibilityState).toEqual({ selected: true })

    const activeTabStyle = Object.assign(
      {},
      ...(Array.isArray(activeTabButton.props.style)
        ? activeTabButton.props.style
        : [activeTabButton.props.style])
    )
    expect(activeTabStyle.backgroundColor).toBe('#333333')
    expect(activeTabStyle.borderColor).toBe('#444444')

    const activeLabel = screen.getByText('Import')
    const activeLabelStyle = Object.assign(
      {},
      ...(Array.isArray(activeLabel.props.style)
        ? activeLabel.props.style
        : [activeLabel.props.style])
    )
    expect(activeLabelStyle.color).toBe('#ffffff')

    const inactiveTabButton = screen.getByLabelText('Account')
    expect(inactiveTabButton.props.accessibilityState).toEqual({ selected: false })

    const inactiveLabel = screen.getByText('Account')
    const inactiveLabelStyle = Object.assign(
      {},
      ...(Array.isArray(inactiveLabel.props.style)
        ? inactiveLabel.props.style
        : [inactiveLabel.props.style])
    )
    expect(inactiveLabelStyle.color).toBe('#888888')
  })

  it('triggers onChange(key) when a tab button is pressed', () => {
    const onChange = jest.fn()
    render(
      <SettingsTabBar tabs={mockTabs} activeTab="account" onChange={onChange} />
    )

    fireEvent.press(screen.getByText('Export'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('export' as SettingsTabKey)
  })

  it('triggers onLayout handler and handles scrolling when layout x is recorded', () => {
    const onChange = jest.fn()
    render(
      <SettingsTabBar tabs={mockTabs} activeTab="account" onChange={onChange} />
    )

    const exportTab = screen.getByLabelText('Export')

    fireEvent(exportTab, 'layout', {
      nativeEvent: {
        layout: { x: 100, y: 0, width: 80, height: 40 },
      },
    })

    fireEvent.press(exportTab)

    expect(onChange).toHaveBeenCalledWith('export')
  })
})
