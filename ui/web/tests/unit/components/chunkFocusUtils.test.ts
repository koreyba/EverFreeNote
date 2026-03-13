import { scrollEditorToChunk } from '@ui/web/components/chunkFocusUtils'

jest.mock('@tiptap/pm/state', () => ({
  TextSelection: {
    near: jest.fn((pos) => ({ kind: 'near-selection', pos })),
  },
}))

jest.mock('@/extensions/ChunkFocus', () => ({
  CHUNK_FOCUS_KEY: 'chunk-focus-key',
}))

type TextBlockNode = {
  isTextblock: true
  textContent: string
  nodeSize: number
}

function createEditor({
  blocks,
  resolve,
  queryElement,
}: {
  blocks: Array<{ pos: number; node: TextBlockNode }>
  resolve: (pos: number) => {
    depth: number
    node: (depth: number) => { type: { name: string } }
    before: (depth: number) => number
    after: (depth: number) => number
  }
  queryElement: HTMLElement | null
}) {
  const transaction = {
    setMeta: jest.fn().mockReturnThis(),
    setSelection: jest.fn().mockReturnThis(),
  }
  const dispatch = jest.fn()
  const querySelector = jest.fn(() => queryElement)

  return {
    state: {
      doc: {
        content: { size: 200 },
        descendants: (visitor: (node: TextBlockNode, pos: number) => boolean) => {
          for (const block of blocks) {
            const shouldContinue = visitor(block.node, block.pos)
            if (shouldContinue === false) {
              continue
            }
          }
        },
        resolve,
      },
      tr: transaction,
    },
    view: {
      dispatch,
      dom: {
        querySelector,
      },
    },
    __transaction: transaction,
    __dispatch: dispatch,
    __querySelector: querySelector,
  }
}

describe('chunkFocusUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns false without dispatching when no text block overlaps the chunk', () => {
    const element = document.createElement('div')
    element.scrollIntoView = jest.fn()

    const editor = createEditor({
      blocks: [
        {
          pos: 0,
          node: { isTextblock: true, textContent: 'alpha', nodeSize: 7 },
        },
      ],
      resolve: () => ({
        depth: 0,
        node: () => ({ type: { name: 'paragraph' } }),
        before: () => 0,
        after: () => 0,
      }),
      queryElement: element,
    })

    const didScroll = scrollEditorToChunk(editor as never, 20, 4)

    expect(didScroll).toBe(false)
    expect(editor.__dispatch).not.toHaveBeenCalled()
    expect(element.scrollIntoView).not.toHaveBeenCalled()
  })

  it('dispatches chunk focus metadata and scrolls via the nearest scroll parent', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const getComputedStyleSpy = jest.spyOn(window, 'getComputedStyle')

    const scrollParent = document.createElement('div')
    const chunkElement = document.createElement('div')
    scrollParent.appendChild(chunkElement)
    scrollParent.scrollTo = jest.fn()
    Object.defineProperty(scrollParent, 'scrollHeight', { value: 600, configurable: true })
    Object.defineProperty(scrollParent, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollParent, 'scrollTop', { value: 25, configurable: true, writable: true })
    scrollParent.getBoundingClientRect = jest.fn(() => ({
      top: 40,
      left: 0,
      bottom: 340,
      right: 200,
      width: 200,
      height: 300,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    }))
    chunkElement.getBoundingClientRect = jest.fn(() => ({
      top: 190,
      left: 0,
      bottom: 240,
      right: 180,
      width: 180,
      height: 50,
      x: 0,
      y: 190,
      toJSON: () => ({}),
    }))

    getComputedStyleSpy.mockImplementation((element: Element) => {
      if (element === scrollParent) {
        return { overflowY: 'auto' } as CSSStyleDeclaration
      }
      return { overflowY: 'visible' } as CSSStyleDeclaration
    })

    const editor = createEditor({
      blocks: [
        {
          pos: 5,
          node: { isTextblock: true, textContent: 'alpha beta gamma', nodeSize: 18 },
        },
      ],
      resolve: () => ({
        depth: 1,
        node: (depth: number) => (
          depth === 1 ? { type: { name: 'bulletList' } } : { type: { name: 'paragraph' } }
        ),
        before: () => 2,
        after: () => 28,
      }),
      queryElement: chunkElement,
    })

    const didScroll = scrollEditorToChunk(editor as never, 4, 5)

    expect(didScroll).toBe(true)
    expect(editor.__transaction.setMeta).toHaveBeenCalledWith('chunk-focus-key', {
      ranges: [{ from: 2, to: 28 }],
    })
    expect(editor.__dispatch).toHaveBeenCalledWith(editor.state.tr)
    expect(scrollParent.scrollTo).toHaveBeenCalledWith({ top: 127, behavior: 'auto' })

    rafSpy.mockRestore()
    getComputedStyleSpy.mockRestore()
  })

  it('falls back to native scrollIntoView when there is no scroll parent', () => {
    const element = document.createElement('div')
    element.scrollIntoView = jest.fn()

    const editor = createEditor({
      blocks: [
        {
          pos: 3,
          node: { isTextblock: true, textContent: 'focus me please', nodeSize: 17 },
        },
      ],
      resolve: () => ({
        depth: 0,
        node: () => ({ type: { name: 'paragraph' } }),
        before: () => 3,
        after: () => 20,
      }),
      queryElement: element,
    })

    const didScroll = scrollEditorToChunk(editor as never, 2, 6)

    expect(didScroll).toBe(true)
    expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })
})
