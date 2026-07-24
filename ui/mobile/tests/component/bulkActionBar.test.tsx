import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { BulkActionBar } from '@ui/mobile/components/BulkActionBar'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#e0e0e0',
      primary: '#007aff',
      mutedForeground: '#666666',
      destructive: '#ff3b30',
      destructiveForeground: '#ffffff',
    },
  }),
}))

describe('BulkActionBar', () => {
  const defaultProps = {
    selectedCount: 2,
    totalCount: 5,
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onDelete: jest.fn(),
    isPending: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders selected count and select all button text', () => {
    render(<BulkActionBar {...defaultProps} />)

    expect(screen.getByText('2 selected')).toBeTruthy()
    expect(screen.getByText('Select All (5)')).toBeTruthy()
  })

  it('triggers onSelectAll when select all button is pressed', () => {
    const onSelectAll = jest.fn()
    render(<BulkActionBar {...defaultProps} onSelectAll={onSelectAll} />)

    fireEvent.press(screen.getByText('Select All (5)'))

    expect(onSelectAll).toHaveBeenCalledTimes(1)
  })

  it('shows Deselect All and triggers onDeselectAll when all items are selected', () => {
    const onDeselectAll = jest.fn()
    render(
      <BulkActionBar
        {...defaultProps}
        selectedCount={5}
        totalCount={5}
        onDeselectAll={onDeselectAll}
      />
    )

    expect(screen.getByText('Deselect All')).toBeTruthy()
    expect(screen.getByText('5 selected')).toBeTruthy()

    fireEvent.press(screen.getByText('Deselect All'))

    expect(onDeselectAll).toHaveBeenCalledTimes(1)
  })

  it('disables delete button when selectedCount is 0', () => {
    const onDelete = jest.fn()
    render(
      <BulkActionBar
        {...defaultProps}
        selectedCount={0}
        totalCount={5}
        onDelete={onDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete 0 notes' })
    expect(deleteButton.props.accessibilityState.disabled).toBe(true)

    fireEvent.press(deleteButton)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('disables delete button when isPending is true', () => {
    const onDelete = jest.fn()
    render(
      <BulkActionBar
        {...defaultProps}
        selectedCount={2}
        totalCount={5}
        isPending={true}
        onDelete={onDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete 2 notes' })
    expect(deleteButton.props.accessibilityState.disabled).toBe(true)

    fireEvent.press(deleteButton)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('enables delete button and triggers onDelete when pressed with selectedCount > 0 and isPending is false', () => {
    const onDelete = jest.fn()
    render(
      <BulkActionBar
        {...defaultProps}
        selectedCount={3}
        totalCount={5}
        isPending={false}
        onDelete={onDelete}
      />
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete 3 notes' })
    expect(deleteButton.props.accessibilityState.disabled).toBe(false)

    fireEvent.press(deleteButton)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
