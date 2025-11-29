import { EnexParser } from '../../../../lib/enex/parser'

describe('EnexParser', () => {
  const parser = new EnexParser()

  it('parses a valid ENEX file with a single note', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <en-export export-date="20230101T000000Z" application="Evernote" version="10.0.0">
        <note>
          <title>Test Note</title>
          <content>
            <![CDATA[<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
            <en-note><div>Test Content</div></en-note>]]>
          </content>
          <created>20230101T120000Z</created>
          <updated>20230102T120000Z</updated>
          <tag>tag1</tag>
          <tag>tag2</tag>
          <resource>
            <data encoding="base64">
              R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
            </data>
            <mime>image/gif</mime>
            <width>1</width>
            <height>1</height>
            <file-name>pixel.gif</file-name>
          </resource>
        </note>
      </en-export>
    `
    const file = new File([xml], 'test.enex', { type: 'application/xml' })
    const notes = await parser.parse(file)

    expect(notes).to.have.length(1)
    const note = notes[0]
    expect(note.title).to.equal('Test Note')
    expect(note.content).to.contain('<div>Test Content</div>')
    expect(note.created.toISOString()).to.equal('2023-01-01T12:00:00.000Z')
    expect(note.updated.toISOString()).to.equal('2023-01-02T12:00:00.000Z')
    expect(note.tags).to.deep.equal(['tag1', 'tag2'])
    expect(note.resources).to.have.length(1)
    expect(note.resources[0].mime).to.equal('image/gif')
    expect(note.resources[0].width).to.equal(1)
    expect(note.resources[0].height).to.equal(1)
    expect(note.resources[0].fileName).to.equal('pixel.gif')
  })

  it('handles invalid XML', async () => {
    const xml = '<invalid>xml'
    const file = new File([xml], 'invalid.enex', { type: 'application/xml' })
    
    try {
      await parser.parse(file)
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).to.contain('Failed to parse .enex file')
    }
  })

  it('handles missing fields', async () => {
    const xml = `
      <en-export>
        <note>
          <content><![CDATA[<en-note>Content</en-note>]]></content>
        </note>
      </en-export>
    `
    const file = new File([xml], 'missing.enex', { type: 'application/xml' })
    const notes = await parser.parse(file)

    expect(notes).to.have.length(1)
    expect(notes[0].title).to.equal('Untitled')
    expect(notes[0].tags).to.be.empty
    expect(notes[0].resources).to.be.empty
    expect(notes[0].created).to.be.instanceOf(Date)
    expect(notes[0].updated).to.be.instanceOf(Date)
  })

  it('extracts content without en-note wrapper if missing', async () => {
    const xml = `
      <en-export>
        <note>
          <content><![CDATA[Just text content]]></content>
        </note>
      </en-export>
    `
    const file = new File([xml], 'text.enex', { type: 'application/xml' })
    const notes = await parser.parse(file)

    expect(notes[0].content).to.equal('Just text content')
  })
})
