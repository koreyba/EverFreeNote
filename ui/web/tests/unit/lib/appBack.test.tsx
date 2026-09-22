import { render, act } from '@testing-library/react'
import { useAppBackHandler, dispatchAppBack, APP_BACK_PRIORITY } from '@ui/web/lib/appBack'

function Layer({ priority, handle }: { priority: number; handle: () => boolean | Promise<boolean> }) {
  useAppBackHandler(priority, handle)
  return null
}

it('consumes Back at the highest active layer and unregisters on unmount', async () => {
  const navigate = jest.fn(() => true)
  const collapse = jest.fn(() => true)
  const screen = render(<Layer priority={APP_BACK_PRIORITY.navigation} handle={navigate} />)
  const editor = render(<Layer priority={APP_BACK_PRIORITY.editor} handle={collapse} />)
  await act(async () => { expect(await dispatchAppBack()).toBe(true) })
  expect(collapse).toHaveBeenCalledTimes(1)
  expect(navigate).not.toHaveBeenCalled()
  editor.unmount()
  await act(async () => { expect(await dispatchAppBack()).toBe(true) })
  expect(navigate).toHaveBeenCalledTimes(1)
  screen.unmount()
  expect(await dispatchAppBack()).toBe(false)
})

it('waits for an asynchronous save before considering navigation handled', async () => {
  let saved = () => {}
  const saving = new Promise<void>(resolve => { saved = resolve })
  const leave = jest.fn()
  render(<Layer priority={10} handle={async () => { await saving; leave(); return true }} />)
  const back = dispatchAppBack()
  expect(leave).not.toHaveBeenCalled()
  await act(async () => { saved(); expect(await back).toBe(true) })
  expect(leave).toHaveBeenCalledTimes(1)
})

it('dismisses an open overlay before any screen handler', async () => {
  const leave = jest.fn(() => true)
  render(<><div data-native-back-layer data-state="open" /><Layer priority={10} handle={leave} /></>)
  const escape = jest.fn()
  document.addEventListener('keydown', escape)
  try {
    expect(await dispatchAppBack()).toBe(true)
    expect(escape).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    expect(leave).not.toHaveBeenCalled()
  } finally { document.removeEventListener('keydown', escape) }
})

it('falls through inactive handlers without emitting a blanket Escape', async () => {
  render(<Layer priority={10} handle={() => false} />)
  const escape = jest.fn()
  document.addEventListener('keydown', escape)
  try {
    expect(await dispatchAppBack()).toBe(false)
    expect(escape).not.toHaveBeenCalled()
  } finally { document.removeEventListener('keydown', escape) }
})
