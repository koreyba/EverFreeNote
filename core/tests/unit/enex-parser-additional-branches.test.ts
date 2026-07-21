/** @jest-environment jsdom */

import { EnexParser } from '../../enex/parser'

const enexFile = (text: string): File => ({ text: async () => text } as File)

describe('EnexParser additional branches', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the exact parsed result for a complete note and its resources', async () => {
    const parser = new EnexParser()
    const file = enexFile(`<?xml version="1.0"?>
      <en-export>
        <note>
          <title>  Project plan  </title>
          <content><![CDATA[<en-note><div>Body <b>content</b></div></en-note>]]></content>
          <created>20260721T123456Z</created>
          <updated>20260722T010203Z</updated>
          <tag> work </tag><tag> </tag><tag>personal</tag>
          <resource>
            <data encoding="base64">  AQID  </data>
            <mime>image/jpeg</mime>
            <resource-attributes><file-name>photo.jpg</file-name><width>640</width><height>480</height></resource-attributes>
          </resource>
        </note>
      </en-export>`)

    await expect(parser.parse(file)).resolves.toEqual([{
      title: 'Project plan',
      content: '<div>Body <b>content</b></div>',
      created: new Date('2026-07-21T12:34:56.000Z'),
      updated: new Date('2026-07-22T01:02:03.000Z'),
      tags: ['work', 'personal'],
      resources: [{ data: 'AQID', mime: 'image/jpeg', width: 640, height: 480, fileName: 'photo.jpg' }],
    }])
  })

  it('parses plain content, multiple notes and notes without the ENEX root', async () => {
    const parser = new EnexParser()
    const file = enexFile(`<wrapper>
      <note><title>First</title><content>plain text</content></note>
      <note><title>Second</title><content><![CDATA[not an en-note wrapper]]></content></note>
    </wrapper>`)
    jest.useFakeTimers({ now: new Date('2026-07-21T00:00:00.000Z') })

    await expect(parser.parse(file)).resolves.toEqual([
      {
        title: 'First',
        content: 'plain text',
        created: new Date('2026-07-21T00:00:00.000Z'),
        updated: new Date('2026-07-21T00:00:00.000Z'),
        tags: [],
        resources: [],
      },
      {
        title: 'Second',
        content: 'not an en-note wrapper',
        created: new Date('2026-07-21T00:00:00.000Z'),
        updated: new Date('2026-07-21T00:00:00.000Z'),
        tags: [],
        resources: [],
      },
    ])
  })

  it('applies defaults for missing fields and preserves observable resource edge values', async () => {
    const parser = new EnexParser()
    jest.useFakeTimers({ now: new Date('2026-07-21T00:00:00.000Z') })
    const file = enexFile(`<en-export><note>
      <title>   </title>
      <resource>
        <data>  </data><mime></mime>
        <resource-attributes><file-name></file-name><width>0</width><height>not-a-number</height></resource-attributes>
      </resource>
      <resource><data> encoded </data></resource>
    </note></en-export>`)

    await expect(parser.parse(file)).resolves.toEqual([{
      title: 'Untitled',
      content: '',
      created: new Date('2026-07-21T00:00:00.000Z'),
      updated: new Date('2026-07-21T00:00:00.000Z'),
      tags: [],
      resources: [
        { data: '', mime: 'image/png', width: 0, height: Number.NaN, fileName: '' },
        { data: 'encoded', mime: 'image/png', width: undefined, height: undefined, fileName: undefined },
      ],
    }])
  })

  it('rejects malformed XML and preserves Error and unknown read failures', async () => {
    const parser = new EnexParser()

    await expect(parser.parse(enexFile('<en-export><note><title>broken</title>')))
      .rejects.toThrow('Failed to parse .enex file: Invalid XML format')
    await expect(parser.parse({
      text: async () => { throw new Error('cannot read file') },
    } as File)).rejects.toThrow('Failed to parse .enex file: cannot read file')
    await expect(parser.parse({
      text: async () => { throw { code: 'READ_FAILED' } },
    } as File)).rejects.toThrow('Failed to parse .enex file: Unknown error')
  })

  it('returns an empty list for an empty ENEX document', async () => {
    await expect(new EnexParser().parse(enexFile('<?xml version="1.0"?><en-export />'))).resolves.toEqual([])
  })
})
