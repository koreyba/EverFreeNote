import {
  buildEnexExportFileName,
  extractEnexContent,
  parseEnexDate,
  parseEnexXml,
  toEnexExportNotes,
} from '@ui/mobile/lib/enexMobile'

describe('enexMobile helpers', () => {
  it('parses Evernote dates', () => {
    expect(parseEnexDate('20260314T103000Z').toISOString()).toBe('2026-03-14T10:30:00.000Z')
  })

  it('extracts ENEX content and replaces media placeholders', () => {
    expect(
      extractEnexContent(
        '<?xml version="1.0"?><!DOCTYPE en-note><en-note><div>Hello</div><en-media type="image/png" hash="123" /></en-note>'
      )
    ).toBe('<div>Hello</div><p>[Imported media placeholder]</p>')
  })

  it('parses ENEX xml into notes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Imported note</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>Hello</div></en-note>]]></content>
    <created>20260314T103000Z</created>
    <updated>20260314T104500Z</updated>
    <tag>mobile</tag>
    <tag>enex</tag>
  </note>
</en-export>`

    expect(parseEnexXml(xml)).toEqual([
      expect.objectContaining({
        title: 'Imported note',
        content: '<div>Hello</div>',
        tags: ['mobile', 'enex'],
        resources: [],
      }),
    ])
  })

  it('maps notes into export format and builds a stable filename', () => {
    const exportNotes = toEnexExportNotes([
      {
        id: '1',
        title: 'My note',
        description: '<p>Hello</p>',
        tags: ['tag-a'],
        created_at: '2026-03-13T12:00:00.000Z',
        updated_at: '2026-03-14T08:30:00.000Z',
        user_id: 'user-1',
      },
    ])

    expect(exportNotes).toEqual([
      {
        title: 'My note',
        content: '<p>Hello</p>',
        created: new Date('2026-03-13T12:00:00.000Z'),
        updated: new Date('2026-03-14T08:30:00.000Z'),
        tags: ['tag-a'],
        resources: [],
      },
    ])

    expect(buildEnexExportFileName(new Date('2026-03-14T08:30:00.000Z'))).toBe(
      'everfreenote-export-20260314-083000.enex'
    )
  })
})
