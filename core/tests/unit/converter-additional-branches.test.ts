/** @jest-environment jsdom */

import { ContentConverter } from '../../enex/converter'

describe('ContentConverter additional branches', () => {
  it('uses the empty-resource default and keeps ordinary content intact', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)

    const result = await converter.convert('<p>Plain content</p>', undefined, 'user', 'note')

    expect(result).toBe('<p>Plain content</p>')
  })

  it('marks every supported unsupported ENML block and removes the ENML wrapper', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)

    const result = await converter.convert(
      '<en-note><pre>code</pre><en-todo checked="true">todo</en-todo><en-crypt>secret</en-crypt></en-note>',
      [],
      'user',
      'note',
    )

    expect(result).toContain('[Unsupported content: Code Block]')
    expect(result).toContain('[Unsupported content: Checkbox]')
    expect(result).toContain('[Unsupported content: Encrypted Text]')
    expect(result).not.toContain('<en-note>')
    expect(result).not.toContain('</en-note>')
  })

  it('uses the first resource when duplicate hashes compete for one media tag', async () => {
    const upload = jest.fn()
      .mockResolvedValueOnce('https://cdn.test/first.png')
      .mockResolvedValueOnce('https://cdn.test/second.png')
    const converter = new ContentConverter({ upload } as never)
    const resources = [
      { data: 'AQ==', mime: 'image/png', hash: 'DUPLICATE-HASH' },
      { data: 'Ag==', mime: 'image/jpeg', hash: 'duplicate-hash' },
    ]

    const result = await converter.convert(
      '<en-media hash="Duplicate-Hash"/>',
      resources,
      'user',
      'note',
    )

    expect(result).toContain('src="https://cdn.test/first.png"')
    expect(result).not.toContain('second.png')
    expect(upload).toHaveBeenNthCalledWith(1, 'AQ==', 'image/png', 'user', 'note', 'image_0')
    expect(upload).toHaveBeenNthCalledWith(2, 'Ag==', 'image/jpeg', 'user', 'note', 'image_1')
  })

  it('removes leading and trailing empty paragraphs without removing the content between them', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)

    const result = await converter.convert('<p></p><p>Keep this</p><p><br></p>', [], 'user', 'note')

    expect(result).toBe('<p>Keep this</p>')
  })

  it('preserves non-empty and non-terminal paragraphs during cleanup', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)

    const result = await converter.convert('<p>Keep</p><p>Not empty<br></p><span>tail</span>', [], 'user', 'note')

    expect(result).toContain('<p>Keep</p>')
    expect(result).toContain('<p>Not empty<br /></p>')
    expect(result).toContain('<span>tail</span>')
  })

  it('normalizes a br-only paragraph while preserving its attributes', async () => {
    const converter = new ContentConverter({ upload: jest.fn() } as never)

    const result = await converter.convert(
      '<p>Before</p><p class="blank"><br></p><p>After</p>',
      [],
      'user',
      'note',
    )

    expect(result).toBe('<p>Before</p><p class="blank"></p><p>After</p>')
  })
})
