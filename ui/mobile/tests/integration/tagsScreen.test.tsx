import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Alert } from 'react-native'
import TagsScreen from '@ui/mobile/app/(tabs)/tags'

const mockPush = jest.fn()
const mockRename = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn(), isPending: false }
const mockRefetch = jest.fn()
const mockUseTagManagementData = jest.fn()
const baseTags = [
  { name: 'Alpha', count: 1, letter: 'A' },
  { name: 'Beta', count: 2, letter: 'B' },
  { name: '#todo', count: 1, letter: '#' },
]

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#dddddd',
      foreground: '#111111',
      mutedForeground: '#777777',
      primary: '#008000',
      primaryForeground: '#ffffff',
      card: '#fafafa',
      secondary: '#eeeeee',
      secondaryForeground: '#222222',
      accent: '#e8f5e9',
      destructive: '#cc0000',
      destructiveForeground: '#ffffff',
      ring: '#009900',
    },
  }),
  useCollapsibleTabBar: () => ({ onScroll: jest.fn(), reset: jest.fn(), isVisible: true }),
}))

jest.mock('@ui/mobile/hooks', () => ({
  useTagManagementData: (...args: unknown[]) => mockUseTagManagementData(...args),
  useRenameTag: () => mockRename,
  useDeleteTag: () => mockDelete,
}))

jest.mock('lucide-react-native', () => ({
  Search: 'Search',
  X: 'X',
  Tag: 'Tag',
  MoreVertical: 'MoreVertical',
}))

describe('TagsScreen', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    mockUseTagManagementData.mockReturnValue({
      allTags: baseTags,
      letters: ['A', 'B', '#'],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  const pressAlertButton = (title: string, text: string) => {
    const call = alertSpy.mock.calls.find((args) => args[0] === title)
    const buttons = (call?.[2] ?? []) as Array<{ text?: string; onPress?: () => void }>
    buttons.find((button) => button.text === text)?.onPress?.()
  }

  it('renders the native manager, clears search, selects a letter, and opens filtered notes', () => {
    render(<TagsScreen />)

    expect(screen.getByText('Tag Management')).toBeTruthy()
    expect(screen.getByText('Total tags: 3')).toBeTruthy()
    expect(screen.getByLabelText('Open notes tagged Alpha')).toBeTruthy()

    fireEvent.changeText(screen.getByLabelText('Search tags'), 'beta')
    expect(screen.getByLabelText('Clear tag search')).toBeTruthy()
    expect(screen.queryByLabelText('Open notes tagged Alpha')).toBeNull()
    fireEvent.press(screen.getByLabelText('Clear tag search'))
    expect(screen.getByLabelText('Open notes tagged Alpha')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Show tags beginning with B'))
    expect(screen.getByLabelText('Open notes tagged Beta')).toBeTruthy()
    expect(screen.queryByLabelText('Open notes tagged Alpha')).toBeNull()

    fireEvent.press(screen.getByLabelText('Open notes tagged Beta'))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/search',
      params: { tag: 'Beta' },
    })
  })

  it('opens native tag actions and rename modal', () => {
    render(<TagsScreen />)

    fireEvent.press(screen.getByLabelText('Actions for tag Alpha'))
    expect(screen.getByText('Rename')).toBeTruthy()
    fireEvent.press(screen.getByText('Rename'))

    expect(screen.getByText('Rename tag')).toBeTruthy()
    expect(screen.getByLabelText('New tag name')).toBeTruthy()
  })

  it('renders loading, error, empty, and no-results states', () => {
    mockUseTagManagementData.mockReturnValueOnce({
      allTags: [], letters: [], isLoading: true, error: null, refetch: mockRefetch,
    })
    const loading = render(<TagsScreen />)
    expect(screen.getByTestId('tags-loading-state')).toBeTruthy()
    loading.unmount()

    mockUseTagManagementData.mockReturnValueOnce({
      allTags: [], letters: [], isLoading: false, error: new Error('Network unavailable'), refetch: mockRefetch,
    })
    const error = render(<TagsScreen />)
    expect(screen.getByText('Network unavailable')).toBeTruthy()
    fireEvent.press(screen.getByText('Try again'))
    expect(mockRefetch).toHaveBeenCalled()
    error.unmount()

    mockUseTagManagementData.mockReturnValueOnce({
      allTags: [], letters: [], isLoading: false, error: null, refetch: mockRefetch,
    })
    const empty = render(<TagsScreen />)
    expect(screen.getByTestId('tags-empty-state')).toBeTruthy()
    empty.unmount()

    mockUseTagManagementData.mockReturnValueOnce({
      allTags: baseTags, letters: ['A', 'B', '#'], isLoading: false, error: null, refetch: mockRefetch,
    })
    render(<TagsScreen />)
    fireEvent.changeText(screen.getByLabelText('Search tags'), 'missing')
    expect(screen.getByTestId('tags-no-results-state')).toBeTruthy()
  })

  it('validates rename input and confirms a merge with an existing tag', () => {
    render(<TagsScreen />)
    fireEvent.press(screen.getByLabelText('Actions for tag Alpha'))
    fireEvent.press(screen.getByText('Rename'))
    fireEvent.changeText(screen.getByLabelText('New tag name'), '')
    fireEvent.press(screen.getByText('Save'))
    expect(screen.getByText('Tag name cannot be empty')).toBeTruthy()

    fireEvent.changeText(screen.getByLabelText('New tag name'), 'Beta')
    fireEvent.press(screen.getByText('Save'))
    expect(alertSpy).toHaveBeenCalledWith(
      'Merge tags?',
      '"Alpha" will be merged into "Beta" across all affected notes.',
      expect.any(Array)
    )
    pressAlertButton('Merge tags?', 'Merge')
    expect(mockRename.mutate).toHaveBeenCalledWith(
      { tag: 'Alpha', replacement: 'Beta' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    )
  })

  it('submits a rename, reports mutation errors, and handles delete confirmation', () => {
    mockRename.mutate.mockImplementation((_input, options) => options.onSuccess())
    mockDelete.mutate.mockImplementation((_input, options) => options.onError(new Error('Delete failed')))
    render(<TagsScreen />)

    fireEvent.press(screen.getByLabelText('Actions for tag Alpha'))
    fireEvent.press(screen.getByText('Rename'))
    fireEvent.changeText(screen.getByLabelText('New tag name'), 'Gamma')
    fireEvent.press(screen.getByText('Save'))
    expect(mockRename.mutate).toHaveBeenCalledWith({ tag: 'Alpha', replacement: 'Gamma' }, expect.any(Object))
    expect(screen.queryByText('Rename tag')).toBeNull()

    fireEvent.press(screen.getByLabelText('Actions for tag Alpha'))
    fireEvent.press(screen.getByText('Delete'))
    pressAlertButton('Delete tag?', 'Delete')
    expect(mockDelete.mutate).toHaveBeenCalledWith(
      { tag: 'Alpha' },
      expect.objectContaining({ onError: expect.any(Function) })
    )
    expect(alertSpy).toHaveBeenCalledWith('Delete failed', 'Delete failed')
  })
})
