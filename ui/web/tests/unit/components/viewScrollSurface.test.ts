import { restoreViewScroll } from '@ui/web/components/features/notes/viewScrollSurface'

describe('restoreViewScroll cleanup', () => {
  it.each(['frame', 'unmount'] as const)('removes temporary input listeners after %s', finish => {
    const node = document.createElement('div')
    document.body.append(node)
    Object.defineProperty(node, 'scrollTop', { configurable: true, get: () => 0, set: () => undefined })
    const nodeAdd = jest.spyOn(node, 'addEventListener')
    const nodeRemove = jest.spyOn(node, 'removeEventListener')
    const documentAdd = jest.spyOn(document, 'addEventListener')
    const documentRemove = jest.spyOn(document, 'removeEventListener')
    let callback: FrameRequestCallback | undefined
    const request = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(frame => { callback = frame; return 42 })
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)

    try {
      const cleanup = restoreViewScroll(node, 600)
      expect(cleanup).toBeDefined()
      if (finish === 'frame') {
        if (!callback) throw new Error('Missing restoration frame')
        callback(0)
      } else {
        cleanup?.()
        expect(cancel).toHaveBeenCalledWith(42)
      }
      for (const type of ['scroll', 'wheel', 'touchstart', 'pointerdown']) {
        const listener = nodeAdd.mock.calls.find(([name]) => name === type)?.[1]
        expect(listener).toBeDefined()
        expect(nodeRemove).toHaveBeenCalledWith(type, listener)
      }
      const keyListener = documentAdd.mock.calls.find(([name]) => name === 'keydown')?.[1]
      expect(keyListener).toBeDefined()
      expect(documentRemove).toHaveBeenCalledWith('keydown', keyListener)
    } finally {
      node.remove()
      nodeAdd.mockRestore()
      nodeRemove.mockRestore()
      documentAdd.mockRestore()
      documentRemove.mockRestore()
      request.mockRestore()
      cancel.mockRestore()
    }
  })
  it('keeps the other pane restoration when a navigation key is pressed in one pane', () => {
    const leftPane = document.createElement('section')
    const rightPane = document.createElement('section')
    leftPane.dataset.testid = 'split-pane-left'
    rightPane.dataset.testid = 'split-pane-right'
    const left = document.createElement('div')
    const right = document.createElement('div')
    leftPane.append(left)
    rightPane.append(right)
    document.body.append(leftPane, rightPane)
    let ready = false
    let leftPosition = 0
    let rightPosition = 0
    Object.defineProperty(left, 'scrollTop', { configurable: true, get: () => leftPosition, set: (value: number) => { leftPosition = ready ? value : 0 } })
    Object.defineProperty(right, 'scrollTop', { configurable: true, get: () => rightPosition, set: (value: number) => { rightPosition = ready ? value : 0 } })
    const frames: FrameRequestCallback[] = []
    const request = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length })
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    try {
      const cleanupLeft = restoreViewScroll(left, 600)
      const cleanupRight = restoreViewScroll(right, 600)
      right.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      ready = true
      frames.forEach(callback => callback(0))
      expect(leftPosition).toBe(600)
      expect(rightPosition).toBe(0)
      cleanupLeft?.()
      cleanupRight?.()
    } finally {
      leftPane.remove()
      rightPane.remove()
      request.mockRestore()
      cancel.mockRestore()
    }
  })

})
