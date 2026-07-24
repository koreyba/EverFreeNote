import { renderHook } from '@testing-library/react-native'
import { useTheme } from '@ui/mobile/providers/ThemeProvider'

// ThemeProvider line 71: error thrown when useTheme is called outside of ThemeProvider
describe('useTheme', () => {
  it('throws an error when used outside of ThemeProvider', () => {
    // Suppress the React error boundary console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within ThemeProvider')

    consoleSpy.mockRestore()
  })
})
