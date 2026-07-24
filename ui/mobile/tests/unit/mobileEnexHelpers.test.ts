import {
  buildEnexExportFileName,
  extractEnexContent,
  parseEnexDate,
  parseEnexXml,
  toEnexExportNotes,
} from '@ui/mobile/lib/enexMobile'

describe('enexMobile helpers', () => {
  describe('parseEnexDate', () => {
    it('parses standard Evernote UTC date format (YYYYMMDDTHHMMSSZ)', () => {
      expect(parseEnexDate('20260314T103000Z').toISOString()).toBe('2026-03-14T10:30:00.000Z')
    })

    it('parses ISO date string fallback', () => {
      expect(parseEnexDate('2026-05-20T12:00:00.000Z').toISOString()).toBe(
        '2026-05-20T12:00:00.000Z'
      )
    })

    it('returns a valid Date for null, undefined, or empty/whitespace strings', () => {
      const nowMs = Date.now()
      expect(parseEnexDate(null).getTime()).toBeGreaterThanOrEqual(nowMs - 1000)
      expect(parseEnexDate(undefined).getTime()).toBeGreaterThanOrEqual(nowMs - 1000)
      expect(parseEnexDate('   ').getTime()).toBeGreaterThanOrEqual(nowMs - 1000)
    })

    it('returns current date when given an invalid date string', () => {
      const nowMs = Date.now()
      expect(parseEnexDate('invalid-date-string').getTime()).toBeGreaterThanOrEqual(nowMs - 1000)
    })
  })

  describe('extractEnexContent', () => {
    it('extracts ENEX content and replaces self-closing and paired media placeholders', () => {
      const xmlContent = `<?xml version="1.0"?><!DOCTYPE en-note><en-note><div>Header</div><en-media type="image/png" hash="123" /><en-media type="audio/wav">audio data</en-media></en-note>`
      expect(extractEnexContent(xmlContent)).toBe(
        '<div>Header</div><p>[Imported media placeholder]</p><p>[Imported media placeholder]</p>'
      )
    })

    it('returns original trimmed text if no <en-note> wrapper exists', () => {
      expect(extractEnexContent('  <div>Raw Text</div>  ')).toBe('<div>Raw Text</div>')
    })
  })

  describe('parseEnexXml', () => {
    it('parses ENEX xml containing single note', () => {
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
          created: new Date('2026-03-14T10:30:00.000Z'),
          updated: new Date('2026-03-14T10:45:00.000Z'),
          tags: ['mobile', 'enex'],
          resources: [],
        }),
      ])
    })

    it('parses ENEX xml containing multiple notes', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>First Note</title>
    <content><![CDATA[<en-note><div>Note 1</div></en-note>]]></content>
  </note>
  <note>
    <title>Second Note</title>
    <content><![CDATA[<en-note><div>Note 2</div></en-note>]]></content>
  </note>
</en-export>`

      const results = parseEnexXml(xml)
      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('First Note')
      expect(results[0].content).toBe('<div>Note 1</div>')
      expect(results[1].title).toBe('Second Note')
      expect(results[1].content).toBe('<div>Note 2</div>')
    })

    it('handles object-structured content ({ "#text": "..." }) and single string tag', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>Object Content Note</title>
    <content><![CDATA[<en-note>Text object</en-note>]]></content>
    <tag>single-tag</tag>
  </note>
</en-export>`

      const results = parseEnexXml(xml)
      expect(results[0].title).toBe('Object Content Note')
      expect(results[0].tags).toEqual(['single-tag'])
    })

    it('normalizes whitespace-only ENEX titles to Untitled and handles missing updated date', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<en-export>
  <note>
    <title>   </title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note><en-note><div>Hello</div></en-note>]]></content>
    <created>20260314T103000Z</created>
  </note>
</en-export>`

      const results = parseEnexXml(xml)
      expect(results[0].title).toBe('Untitled')
      expect(results[0].updated).toEqual(new Date('2026-03-14T10:30:00.000Z'))
    })

    it('handles empty XML or missing en-export notes', () => {
      expect(parseEnexXml('<en-export></en-export>')).toEqual([])
    })
  })

  describe('buildEnexExportFileName', () => {
    it('builds export filename for specified date', () => {
      expect(buildEnexExportFileName(new Date('2026-03-14T08:30:00.000Z'))).toBe(
        'everfreenote-export-20260314-083000.enex'
      )
    })

    it('builds export filename using default current date when omitted', () => {
      const filename = buildEnexExportFileName()
      expect(filename).toMatch(/^everfreenote-export-\d{8}-\d{6}\.enex$/)
    })
  })

  describe('toEnexExportNotes', () => {
    it('maps standard note rows into export format', () => {
      const exportNotes = toEnexExportNotes([
        {
          id: '1',
          title: 'My note',
          description: '<p>Hello</p>',
          tags: ['tag-a'],
          created_at: '2026-03-13T12:00:00.000Z',
          updated_at: '2026-03-14T08:30:00.000Z',
          user_id: 'user-1',
        } as unknown as Parameters<typeof toEnexExportNotes>[0][number],
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
    })

    it('handles null/missing titles, descriptions, tags, and updated_at', () => {
      const exportNotes = toEnexExportNotes([
        {
          id: '2',
          title: null,
          description: null,
          tags: null,
          created_at: '2026-03-13T12:00:00.000Z',
          updated_at: null,
          user_id: 'user-1',
        } as unknown as Parameters<typeof toEnexExportNotes>[0][number],
      ])

      expect(exportNotes).toEqual([
        {
          title: 'Untitled',
          content: '',
          created: new Date('2026-03-13T12:00:00.000Z'),
          updated: new Date('2026-03-13T12:00:00.000Z'),
          tags: [],
          resources: [],
        },
      ])
    })
  })
})
