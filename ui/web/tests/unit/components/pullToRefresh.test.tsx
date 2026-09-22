import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Capacitor } from '@capacitor/core'
import { toast } from 'sonner'
import { PullToRefresh } from '@ui/web/components/PullToRefresh'

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn(() => true), getPlatform: jest.fn(() => 'android') } }))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

function swipe(target: Element, dx = 0, dy = 140) {
  fireEvent.touchStart(target, { touches: [{ identifier: 1, clientX: 80, clientY: 100 }] })
  fireEvent.touchMove(target, { touches: [{ identifier: 1, clientX: 80 + dx, clientY: 100 + dy }] })
  fireEvent.touchEnd(target, { touches: [] })
}
function mount(onRefresh: jest.Mock<Promise<void>, [AbortSignal]> = jest.fn().mockResolvedValue(undefined)) {
  const view = render(<PullToRefresh onRefresh={onRefresh}><div data-testid="scroll"><span>Note text</span><button>Action</button></div></PullToRefresh>)
  return { ...view, onRefresh, target: screen.getByText('Note text'), scroll: screen.getByTestId('scroll') }
}
afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); jest.useRealTimers() })

it('refreshes only on release past the threshold and shows an in-flight indicator', async () => {
  let finish!: () => void
  const { target, onRefresh } = mount(jest.fn<Promise<void>, [AbortSignal]>(() => new Promise<void>(resolve => { finish = resolve })))
  fireEvent.touchStart(target, { touches: [{ identifier: 1, clientX: 80, clientY: 100 }] })
  fireEvent.touchMove(target, { touches: [{ identifier: 1, clientX: 80, clientY: 240 }] })
  expect(onRefresh).not.toHaveBeenCalled()
  expect(screen.getByRole('status').textContent).toContain('Release')
  fireEvent.touchEnd(target, { touches: [] })
  expect(onRefresh).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status').textContent).toContain('Refreshing')
  swipe(target)
  expect(onRefresh).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  expect(screen.queryByRole('status')).toBeNull()
})
it('keeps normal scrolling and ignores short, horizontal and control gestures', () => {
  const { target, scroll, onRefresh } = mount()
  swipe(target, 0, 20)
  swipe(target, 160, 30)
  scroll.scrollTop = 50
  swipe(target)
  scroll.scrollTop = 0
  swipe(screen.getByRole('button'))
  expect(onRefresh).not.toHaveBeenCalled()
})
it('does not refresh in a browser', () => {
  jest.mocked(Capacitor.isNativePlatform).mockReturnValueOnce(false)
  const { target, onRefresh } = mount()
  swipe(target)
  expect(onRefresh).not.toHaveBeenCalled()
})
it('cancels multi-touch and text selection gestures without refreshing', () => {
  const { target, onRefresh } = mount()
  fireEvent.touchStart(target, { touches: [{ clientX: 80, clientY: 100 }] })
  fireEvent.touchMove(target, { touches: [{ clientX: 80, clientY: 240 }, { clientX: 100, clientY: 240 }] })
  fireEvent.touchEnd(target, { touches: [] })
  const range = document.createRange()
  range.selectNodeContents(target)
  window.getSelection()?.addRange(range)
  swipe(target)
  window.getSelection()?.removeAllRanges()
  expect(onRefresh).not.toHaveBeenCalled()
})
it('does not activate a note after pulling or refresh a cancelled gesture', () => {
  const clicked = jest.fn()
  const onRefresh = jest.fn().mockResolvedValue(undefined)
  render(<PullToRefresh onRefresh={onRefresh}><div onClick={clicked}>Clickable note</div></PullToRefresh>)
  const target = screen.getByText('Clickable note')
  swipe(target, 0, 50)
  fireEvent.click(target)
  fireEvent.touchStart(target, { touches: [{ clientX: 80, clientY: 100 }] })
  fireEvent.touchMove(target, { touches: [{ clientX: 80, clientY: 240 }] })
  fireEvent.touchCancel(target)
  fireEvent.touchEnd(target, { touches: [] })
  expect(clicked).not.toHaveBeenCalled()
  expect(onRefresh).not.toHaveBeenCalled()
})
it('releases a failed request and allows another swipe', async () => {
  const { target, onRefresh } = mount(jest.fn().mockRejectedValue(new Error('Offline')))
  swipe(target)
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('status')).toBeNull()
  swipe(target)
  await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2))
})
it('aborts a stalled refresh and stops the indicator after ten seconds', async () => {
  jest.useFakeTimers()
  const { target, onRefresh } = mount(jest.fn<Promise<void>, [AbortSignal]>(() => new Promise<void>(() => undefined)))
  swipe(target)
  await act(async () => jest.advanceTimersByTime(10000))
  expect(onRefresh.mock.calls[0][0].aborted).toBe(true)
  expect(screen.queryByRole('status')).toBeNull()
  expect(toast.error).toHaveBeenCalledTimes(1)
})
it('cancels the request when the surface is removed', () => {
  const { target, onRefresh, unmount } = mount(jest.fn<Promise<void>, [AbortSignal]>(() => new Promise<void>(() => undefined)))
  swipe(target)
  unmount()
  expect(onRefresh.mock.calls[0][0].aborted).toBe(true)
})
