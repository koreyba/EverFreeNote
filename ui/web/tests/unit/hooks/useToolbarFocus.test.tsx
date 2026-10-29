import { act, renderHook } from '@testing-library/react'
import { isAndroid, isiOS, isTextSelection, type CommandProps, type Editor } from '@tiptap/core'
import { useToolbarFocus } from '@ui/web/hooks/useToolbarFocus'

jest.mock('@tiptap/core', () => ({
  ...jest.requireActual('@tiptap/core'),
  isAndroid: jest.fn(),
  isiOS: jest.fn(),
  isTextSelection: jest.fn(),
}))

function setup() {
  const dom = document.createElement('div')
  dom.tabIndex = 0
  const trigger = document.createElement('button')
  const content = document.createElement('div')
  const other = document.createElement('button')
  document.body.append(dom, trigger, content, other)
  const selection = { eq: jest.fn().mockReturnValue(true) }
  const tr = { selection, storedMarks: [{ type: 'bold' }], setStoredMarks: jest.fn() }
  const view = { dom, hasFocus: jest.fn().mockReturnValue(false), focus: jest.fn() }
  const editor = { view, state: { selection }, isDestroyed: false, commands: { scrollIntoView: jest.fn() } }
  const frames: FrameRequestCallback[] = []
  const request = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.push(callback)
    return frames.length
  })
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  const hook = renderHook(() => useToolbarFocus(editor as unknown as Editor, true))
  const origin = { trigger, content }
  const invoke = (dispatch: CommandProps['dispatch'] | null = jest.fn()) => hook.result.current.focusFromToolbar(origin)({
    editor, view, tr, dispatch: dispatch ?? undefined,
  } as unknown as CommandProps)
  const release = (index = 0) => act(() => { frames[index](0) })
  return { ...hook, dom, trigger, content, other, editor, view, tr, selection, frames, request, cancel, invoke, release }
}

beforeEach(() => {
  jest.mocked(isAndroid).mockReturnValue(false)
  jest.mocked(isiOS).mockReturnValue(false)
  jest.mocked(isTextSelection).mockReturnValue(false)
})

afterEach(() => {
  jest.restoreAllMocks()
  document.body.replaceChildren()
})

it('does not change focus or cancel a pending request during a capability check', () => {
  const state = setup()
  act(() => { state.invoke() })
  act(() => { state.invoke(null) })
  expect(state.request).toHaveBeenCalledTimes(1)
  expect(state.cancel).not.toHaveBeenCalled()
  state.release()
  expect(state.view.focus).toHaveBeenCalledTimes(1)
  expect(state.editor.commands.scrollIntoView).toHaveBeenCalledTimes(1)
})

it('cancels the previous frame even when a subsequent command finds the view focused', () => {
  const state = setup()
  act(() => { state.invoke() })
  state.view.hasFocus.mockReturnValue(true)
  act(() => { state.invoke() })
  expect(state.cancel).toHaveBeenCalledWith(1)
  expect(state.request).toHaveBeenCalledTimes(1)
  state.release()
  expect(state.view.focus).not.toHaveBeenCalled()
})

it('preserves stored marks for an unchanged text selection, but not a node selection', () => {
  const state = setup()
  jest.mocked(isTextSelection).mockReturnValue(true)
  act(() => { state.invoke() })
  expect(state.tr.setStoredMarks).toHaveBeenCalledWith(state.tr.storedMarks)
  state.tr.setStoredMarks.mockClear()
  jest.mocked(isTextSelection).mockReturnValue(false)
  act(() => { state.invoke() })
  expect(state.tr.setStoredMarks).not.toHaveBeenCalled()
})

it.each(['Android', 'iOS'])('focuses synchronously on emulated %s and later restores view focus', (platform) => {
  const state = setup()
  jest.mocked(isAndroid).mockReturnValue(platform === 'Android')
  jest.mocked(isiOS).mockReturnValue(platform === 'iOS')
  const focus = jest.spyOn(state.dom, 'focus')
  act(() => { state.invoke() })
  expect(focus).toHaveBeenCalledTimes(1)
  expect(state.view.focus).not.toHaveBeenCalled()
  state.release()
  expect(state.view.focus).toHaveBeenCalledTimes(1)
})

it('accepts the original trigger but does not steal focus from another control', () => {
  const state = setup()
  act(() => { state.invoke(); state.trigger.focus() })
  state.release()
  expect(state.view.focus).toHaveBeenCalledTimes(1)
  state.view.focus.mockClear()
  act(() => { state.invoke(); state.other.focus() })
  state.release(1)
  expect(state.view.focus).not.toHaveBeenCalled()
})

it('ignores an already queued callback after another interaction or toolbar unmount', () => {
  const state = setup()
  act(() => { state.invoke(); document.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
  state.release()
  expect(state.view.focus).not.toHaveBeenCalled()
  act(() => { state.invoke() })
  state.unmount()
  state.release(1)
  expect(state.view.focus).not.toHaveBeenCalled()
})

it('keeps the focus return for ordinary typing but cancels it for keyboard navigation', () => {
  const state = setup()
  act(() => { state.invoke(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })) })
  state.release()
  expect(state.view.focus).toHaveBeenCalledTimes(1)
  state.view.focus.mockClear()
  act(() => { state.invoke(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })) })
  state.release(1)
  expect(state.view.focus).not.toHaveBeenCalled()
})

it('does not scroll after focusing synchronously unmounts the toolbar', () => {
  const state = setup()
  state.view.focus.mockImplementation(() => state.unmount())
  act(() => { state.invoke() })
  state.release()
  expect(state.view.focus).toHaveBeenCalledTimes(1)
  expect(state.editor.commands.scrollIntoView).not.toHaveBeenCalled()
})
