import { EnexBuilder } from '../../enex/enex-builder'

describe('EnexBuilder additional branches', () => {
  it('generates the exact ENEX structure with escaped fields, sorted tags and resources', () => {
    const builder = new EnexBuilder()
    const xml = builder.build([{
      title: `A & <B> "Q" 'P'`,
      content: '<p>Hello</p>',
      created: new Date('2026-02-03T04:05:06.000Z'),
      updated: new Date('2026-02-04T05:06:07.000Z'),
      tags: ['zeta', 'alpha & "tag"'],
      resources: [{
        data: 'AQ==',
        mime: 'application/x&y"m',
        hash: 'ignored-hash',
        width: 10,
        height: 20,
        fileName: 'a&b".bin',
      }],
    }], new Date('2026-02-03T04:05:06.000Z'))

    expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
<en-export export-date="20260203T040506Z" application="EverFreeNote" version="1.0">
<note>
<title>A &amp; &lt;B&gt; &quot;Q&quot; &apos;P&apos;</title>
<content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note><p>Hello</p></en-note>
]]></content>
<created>20260203T040506Z</created>
<updated>20260204T050607Z</updated>
<tag>alpha &amp; &quot;tag&quot;</tag>
<tag>zeta</tag>
<resource>
<data encoding="base64">AQ==</data>
<mime>application/x&amp;y&quot;m</mime>
<width>10</width>
<height>20</height>
<resource-attributes><file-name>a&amp;b&quot;.bin</file-name></resource-attributes>
</resource>
</note>
</en-export>`)
  })

  it('omits optional tags, resources and falsy resource metadata', () => {
    const builder = new EnexBuilder()
    const xml = builder.build([{
      title: 'Minimal',
      content: '',
      created: new Date('2026-01-01T00:00:00.000Z'),
      updated: new Date('2026-01-01T00:00:00.000Z'),
      tags: undefined,
      resources: [{ data: '', mime: 'image/png', hash: 'hash', width: 0, height: 0, fileName: '' }],
    } as never])

    expect(xml).not.toContain('<tag>')
    expect(xml).not.toContain('<width>0</width>')
    expect(xml).not.toContain('<height>0</height>')
    expect(xml).not.toContain('<resource-attributes>')
    expect(xml).toContain('<data encoding="base64"></data>')

    const withoutResources = builder.build([{
      title: 'No resources',
      content: 'Body',
      created: new Date('2026-01-01T00:00:00.000Z'),
      updated: new Date('2026-01-01T00:00:00.000Z'),
      tags: [],
      resources: undefined,
    } as never])
    expect(withoutResources).not.toContain('<resource>')
    expect(withoutResources).not.toContain('<tag>')
  })

  it('builds an empty export with the exact envelope and explicit export date', () => {
    expect(new EnexBuilder().build([], new Date('2026-03-04T05:06:07.000Z'))).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">
<en-export export-date="20260304T050607Z" application="EverFreeNote" version="1.0">

</en-export>`)
  })
})
