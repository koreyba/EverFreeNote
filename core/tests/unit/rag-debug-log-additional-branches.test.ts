import { logRagIndexDebugChunks } from '../../rag/debugLog'

describe('RAG debug logging additional branches', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs exact metadata and keeps previews at or below the truncation boundary intact', () => {
    const group = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    const groupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const chunks = [
      {
        chunkIndex: 0,
        charOffset: 12,
        sectionHeading: 'Introduction',
        title: 'Note title',
        content: 'short content',
      },
      {
        chunkIndex: 4,
        charOffset: 240,
        sectionHeading: null,
        title: null,
        content: 'x'.repeat(120),
      },
      {
        chunkIndex: 5,
        charOffset: 360,
        sectionHeading: 'Long section',
        title: 'Long note',
        content: 'y'.repeat(121),
      },
    ]

    logRagIndexDebugChunks('note-42', chunks)

    expect(group).toHaveBeenCalledWith('[rag-index][debug] 3 chunks for note note-42')
    expect(log).toHaveBeenNthCalledWith(1, '[chunk 0]')
    expect(log).toHaveBeenNthCalledWith(2, {
      chunkIndex: 0,
      charOffset: 12,
      sectionHeading: 'Introduction',
      title: 'Note title',
      contentLength: 13,
      preview: 'short content',
    })
    expect(log).toHaveBeenNthCalledWith(6, {
      chunkIndex: 4,
      charOffset: 240,
      sectionHeading: null,
      title: null,
      contentLength: 120,
      preview: 'x'.repeat(120),
    })
    expect(log).toHaveBeenNthCalledWith(10, {
      chunkIndex: 5,
      charOffset: 360,
      sectionHeading: 'Long section',
      title: 'Long note',
      contentLength: 121,
      preview: `${'y'.repeat(120)}...`,
    })
    expect(log).toHaveBeenNthCalledWith(12, 'y'.repeat(121))
    expect(groupEnd).toHaveBeenCalledTimes(1)
  })

  it('logs empty content and preserves unusual but valid runtime metadata', () => {
    const group = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    const groupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    expect(() => logRagIndexDebugChunks('', [{
      chunkIndex: -1,
      charOffset: -10,
      sectionHeading: null,
      title: null,
      content: '',
    }])).not.toThrow()

    expect(group).toHaveBeenCalledWith('[rag-index][debug] 1 chunks for note ')
    expect(log).toHaveBeenNthCalledWith(1, '[chunk -1]')
    expect(log).toHaveBeenNthCalledWith(2, {
      chunkIndex: -1,
      charOffset: -10,
      sectionHeading: null,
      title: null,
      contentLength: 0,
      preview: '',
    })
    expect(log).toHaveBeenNthCalledWith(3, 'content:')
    expect(log).toHaveBeenNthCalledWith(4, '<empty>')
    expect(groupEnd).toHaveBeenCalledTimes(1)
  })

  it('falls back to console.info when grouping methods are unavailable', () => {
    const originalGroupCollapsed = console.groupCollapsed
    const originalGroupEnd = console.groupEnd
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    try {
      Object.defineProperty(console, 'groupCollapsed', { configurable: true, value: undefined, writable: true })
      Object.defineProperty(console, 'groupEnd', { configurable: true, value: undefined, writable: true })

      logRagIndexDebugChunks('fallback-note', [{
        chunkIndex: 2,
        charOffset: 8,
        sectionHeading: 'Fallback',
        title: 'Fallback title',
        content: 'content',
      }])

      expect(info).toHaveBeenCalledWith('[rag-index][debug] 1 chunks for note fallback-note')
      expect(log).toHaveBeenCalledWith('[chunk 2]')
      expect(log).toHaveBeenCalledWith('content')
    } finally {
      Object.defineProperty(console, 'groupCollapsed', { configurable: true, value: originalGroupCollapsed, writable: true })
      Object.defineProperty(console, 'groupEnd', { configurable: true, value: originalGroupEnd, writable: true })
    }
  })

  it('reports an empty result without attempting to open a group', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined)
    const group = jest.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    logRagIndexDebugChunks('empty-note', [])

    expect(info).toHaveBeenCalledWith('[rag-index] No chunks were produced for note empty-note')
    expect(group).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })
})
