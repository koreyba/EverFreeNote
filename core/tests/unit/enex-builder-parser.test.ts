/** @jest-environment jsdom */

import { EnexBuilder } from '../../enex/enex-builder'
import { formatEvernoteDate } from '../../enex/date-formatter'
import { EnexParser } from '../../enex/parser'

describe('ENEX builder and parser', () => {
  beforeAll(() => {
    expect(typeof DOMParser).toBe('function')
  })

  it('formats dates in Evernote UTC format', () => {
    expect(formatEvernoteDate(new Date('2026-07-21T12:34:56.000Z'))).toBe('20260721T123456Z')
    expect(formatEvernoteDate('2026-01-02T03:04:05.000Z')).toBe('20260102T030405Z')
  })

  it('builds escaped notes, sorted tags, and resources', () => {
    const xml = new EnexBuilder().build([
      {
        title: 'A & <B>',
        content: '<p>Hello</p>',
        created: new Date('2026-01-02T03:04:05Z'),
        updated: new Date('2026-01-03T04:05:06Z'),
        tags: ['zeta', 'alpha'],
        resources: [{ data: 'AQ==', mime: 'image/png', hash: 'abc', width: 20, height: 30, fileName: 'a.png' }],
      },
    ])
    expect(xml).toContain('<title>A &amp; &lt;B&gt;</title>')
    expect(xml.indexOf('<tag>alpha</tag>')).toBeLessThan(xml.indexOf('<tag>zeta</tag>'))
    expect(xml).toContain('<resource-attributes><file-name>a.png</file-name></resource-attributes>')
    expect(xml).toContain('<data encoding="base64">AQ==</data>')
    expect(new EnexBuilder().build([])).toContain('<en-export')
    const minimal = new EnexBuilder().build([{
      title: 'Minimal', content: 'Body', created: new Date('2026-01-01T00:00:00Z'), updated: new Date('2026-01-01T00:00:00Z'),
      tags: [], resources: [{ data: '', mime: 'application/octet-stream', hash: 'empty', fileName: '' }],
    }])
    expect(minimal).toContain('<content><![CDATA[')
    expect(minimal).not.toContain('<tag>')
  })

  it('parses notes, resources, tags, and malformed XML', async () => {
    const parser = new EnexParser()
    const file = { text: async () => `<?xml version="1.0"?><en-export><note>
      <title> Title </title><content><![CDATA[<en-note><p>Body</p></en-note>]]></content>
      <created>20260102T030405Z</created><updated>20260103T040506Z</updated>
      <tag>one</tag><tag> </tag><resource><data>AQ==</data><mime>image/png</mime>
      <resource-attributes><file-name>a.png</file-name><width>4</width><height>5</height></resource-attributes></resource>
    </note></en-export>` }
    const [note] = await parser.parse(file as File)
    expect(note.title).toBe('Title')
    expect(note.content).toContain('<p>Body</p>')
    expect(note.tags).toEqual(['one'])
    expect(note.resources[0]).toMatchObject({ data: 'AQ==', mime: 'image/png', fileName: 'a.png', width: 4, height: 5 })
    await expect(parser.parse({ text: async () => '<en-export><' } as File)).rejects.toThrow('Invalid XML')
    const [minimal] = await parser.parse({ text: async () => '<en-export><note><content>plain</content><resource><data> x </data></resource></note></en-export>' } as File)
    expect(minimal.title).toBe('Untitled')
    expect(minimal.content).toBe('plain')
    expect(minimal.tags).toEqual([])
    expect(minimal.resources[0]).toMatchObject({ data: 'x', mime: 'image/png' })
  })
})
