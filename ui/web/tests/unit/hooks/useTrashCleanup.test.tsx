import { act, renderHook } from '@testing-library/react'
import { useTrashCleanup } from '@ui/web/hooks/useTrashCleanup'
import { NoteService } from '@core/services/notes'

jest.mock('@core/services/notes')
const sweep = jest.fn().mockResolvedValue(1)
beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-05T12:00:00Z') })
  jest
    .mocked(NoteService)
    .mockImplementation(() => ({ cleanupExpiredTrash: sweep }) as never)
})
afterEach(() => jest.useRealTimers())

describe('Trash activity cleanup', () => {
  it('starts after readiness and throttles repeated focus events', async () => {
    const changed = jest.fn()
    renderHook(() =>
      useTrashCleanup({
        supabase: { rpc: jest.fn() } as never,
        userId: 'owner',
        isOffline: false,
        ready: true,
        onCleaned: changed,
      }),
    )
    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(sweep).toHaveBeenCalledTimes(1)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('online'))
    })
    expect(sweep).toHaveBeenCalledTimes(1)
    await act(async () => {
      jest.advanceTimersByTime(3600001)
      window.dispatchEvent(new Event('focus'))
    })
    expect(sweep).toHaveBeenCalledTimes(2)
  })

  it('never starts a cleanup while offline or while local sync is pending', async () => {
    const { rerender } = renderHook(
      ({ offline, ready }) =>
        useTrashCleanup({
          supabase: { rpc: jest.fn() } as never,
          userId: 'owner',
          isOffline: offline,
          ready,
          onCleaned: jest.fn(),
        }),
      { initialProps: { offline: true, ready: true } },
    )
    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(sweep).not.toHaveBeenCalled()
    rerender({ offline: false, ready: false })
    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(sweep).not.toHaveBeenCalled()
  })
})
