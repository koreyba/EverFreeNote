import { act, renderHook } from '@testing-library/react'
import { useGuardedSignOut } from '@ui/web/hooks/useGuardedSignOut'

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

describe('guarded sign out', () => {
  it('does not sign out after a pending check is cancelled', async () => {
    let finish!: (safe: boolean) => void
    const prepare = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve }))
    const signOut = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useGuardedSignOut('user-a', prepare, signOut))
    let pending!: Promise<void>
    act(() => { pending = result.current.request() })
    expect(result.current.phase).toBe('checking')
    act(() => result.current.cancel())
    await act(async () => { finish(true); await pending })
    expect(result.current.phase).toBe('idle')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('does not sign out the next account when identity changes during preparation', async () => {
    let finish!: (safe: boolean) => void
    const prepare = jest.fn(() => new Promise<boolean>(resolve => { finish = resolve }))
    const signOut = jest.fn().mockResolvedValue(undefined)
    const { result, rerender } = renderHook(({ userId }) => useGuardedSignOut(userId, prepare, signOut), {
      initialProps: { userId: 'user-a' },
    })
    let pending!: Promise<void>
    act(() => { pending = result.current.request() })
    rerender({ userId: 'user-b' })
    await act(async () => { finish(true); await pending })
    expect(result.current.phase).toBe('idle')
    expect(signOut).not.toHaveBeenCalled()
  })
})
