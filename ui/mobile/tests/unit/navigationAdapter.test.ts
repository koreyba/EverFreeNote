import { router } from 'expo-router'
import { navigationAdapter } from '@ui/mobile/adapters/navigation'

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}))

describe('navigationAdapter', () => {
  const mockRouter = router as jest.Mocked<typeof router>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls router.push(url) when options is omitted', () => {
    void navigationAdapter.navigate('/notes/123')
    expect(mockRouter.push).toHaveBeenCalledWith('/notes/123')
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('calls router.push(url) when options.replace is false', () => {
    void navigationAdapter.navigate('/notes/123', { replace: false })
    expect(mockRouter.push).toHaveBeenCalledWith('/notes/123')
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('calls router.replace(url) when options.replace is true', () => {
    void navigationAdapter.navigate('/login', { replace: true })
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('logs error and re-throws when router.push throws', () => {
    const error = new Error('Push failed')
    mockRouter.push.mockImplementation(() => {
      throw error
    })

    expect(() => navigationAdapter.navigate('/error-path')).toThrow(error)
    expect(console.error).toHaveBeenCalledWith('[Navigation] Error navigating to:', '/error-path', error)
  })

  it('logs error and re-throws when router.replace throws', () => {
    const error = new Error('Replace failed')
    mockRouter.replace.mockImplementation(() => {
      throw error
    })

    expect(() => navigationAdapter.navigate('/error-path', { replace: true })).toThrow(error)
    expect(console.error).toHaveBeenCalledWith('[Navigation] Error navigating to:', '/error-path', error)
  })
})
