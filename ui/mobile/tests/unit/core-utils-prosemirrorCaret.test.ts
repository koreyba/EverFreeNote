import { placeCaretFromCoords } from '@core/utils/prosemirrorCaret'
import type { EditorView } from 'prosemirror-view'

jest.mock('prosemirror-state', () => {
  return {
    Selection: {
      near: jest.fn(() => ({ kind: 'near' })),
      atStart: jest.fn(() => ({ kind: 'start' })),
      atEnd: jest.fn(() => ({ kind: 'end' })),
    },
  }
})

describe('core/utils/prosemirrorCaret.placeCaretFromCoords', () => {
  type MockTr = {
    setSelection: jest.Mock
    scrollIntoView: jest.Mock
  }

  type MockView = {
    state: {
      doc: { resolve: jest.Mock }
      tr: MockTr
    }
    dispatch: jest.Mock
    focus: jest.Mock
    posAtCoords: jest.Mock
    dom: { getBoundingClientRect: jest.Mock }
  }

  const makeView = (overrides: Partial<MockView> = {}) => {
    const tr = {} as MockTr
    tr.setSelection = jest.fn(() => tr)
    tr.scrollIntoView = jest.fn(() => tr)

    const doc = {
      resolve: jest.fn(() => ({ resolved: true })),
    }

    const view: MockView = {
      state: { doc, tr },
      dispatch: jest.fn(),
      focus: jest.fn(),
      posAtCoords: jest.fn(),
      dom: {
        getBoundingClientRect: jest.fn(() => ({ top: 100, bottom: 200 })),
      },
      ...overrides,
    }

    return { view, tr, doc }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uses posAtCoords + Selection.near when a position is returned', () => {
    const { Selection } = jest.requireMock('prosemirror-state') as {
      Selection: {
        near: jest.Mock
        atStart: jest.Mock
        atEnd: jest.Mock
      }
    }

    const { view, tr, doc } = makeView({
      posAtCoords: jest.fn(() => ({ pos: 5 })),
    })

    const result = placeCaretFromCoords(view as unknown as EditorView, 10, 20)

    expect(result).toEqual({ handled: true, reason: 'posAtCoords' })
    expect(view.posAtCoords).toHaveBeenCalledWith({ left: 10, top: 20 })
    expect(doc.resolve).toHaveBeenCalledWith(5)
    expect(Selection.near).toHaveBeenCalled()
    expect(tr.setSelection).toHaveBeenCalled()
    expect(tr.scrollIntoView).toHaveBeenCalled()
    expect(view.dispatch).toHaveBeenCalledTimes(1)
    expect(view.focus).toHaveBeenCalledTimes(1)
  })

  it('falls back to Selection.atStart when click is above editor bounds', () => {
    const { Selection } = jest.requireMock('prosemirror-state') as {
      Selection: {
        near: jest.Mock
        atStart: jest.Mock
        atEnd: jest.Mock
      }
    }

    const { view } = makeView({
      posAtCoords: jest.fn(() => null),
      dom: { getBoundingClientRect: jest.fn(() => ({ top: 100, bottom: 200 })) },
    })

    const result = placeCaretFromCoords(view as unknown as EditorView, 10, 50)

    expect(result).toEqual({ handled: true, reason: 'fallback-start' })
    expect(Selection.atStart).toHaveBeenCalled()
    expect(view.dispatch).toHaveBeenCalledTimes(1)
    expect(view.focus).toHaveBeenCalledTimes(1)
  })

  it('falls back to Selection.atEnd when click is below editor bounds', () => {
    const { Selection } = jest.requireMock('prosemirror-state') as {
      Selection: {
        near: jest.Mock
        atStart: jest.Mock
        atEnd: jest.Mock
      }
    }

    const { view } = makeView({
      posAtCoords: jest.fn(() => null),
      dom: { getBoundingClientRect: jest.fn(() => ({ top: 100, bottom: 200 })) },
    })

    const result = placeCaretFromCoords(view as unknown as EditorView, 10, 250)

    expect(result).toEqual({ handled: true, reason: 'fallback-end' })
    expect(Selection.atEnd).toHaveBeenCalled()
    expect(view.dispatch).toHaveBeenCalledTimes(1)
    expect(view.focus).toHaveBeenCalledTimes(1)
  })

  it('returns noop when posAtCoords is null and click is within bounds', () => {
    const { view } = makeView({
      posAtCoords: jest.fn(() => null),
      dom: { getBoundingClientRect: jest.fn(() => ({ top: 100, bottom: 200 })) },
    })

    const result = placeCaretFromCoords(view as unknown as EditorView, 10, 150)

    expect(result).toEqual({ handled: false, reason: 'noop' })
    expect(view.dispatch).not.toHaveBeenCalled()
    expect(view.focus).not.toHaveBeenCalled()
  })

  it('is defensive and returns noop on exceptions', () => {
    const { view } = makeView({
      posAtCoords: jest.fn(() => {
        throw new Error('boom')
      }),
    })

    const result = placeCaretFromCoords(view as unknown as EditorView, 10, 20)

    expect(result).toEqual({ handled: false, reason: 'noop' })
  })
})
