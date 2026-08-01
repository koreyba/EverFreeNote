import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import TagsScreen from '@ui/mobile/app/(tabs)/tags'

const mockPush = jest.fn()
const mockRename = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn(), isPending: false }
const mockRefetch = jest.fn()
const mockUseTagManagementData = jest.fn()

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
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseTagManagementData.mockReturnValue({
      allTags: [
        { name: 'Alpha', count: 1, letter: 'A' },
        { name: 'Beta', count: 2, letter: 'B' },
        { name: '#todo', count: 1, letter: '#' },
      ],
      letters: ['A', 'B', '#'],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

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
})
