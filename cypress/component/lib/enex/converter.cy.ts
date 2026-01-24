import { ContentConverter } from '../../../../core/enex/converter'
import { ImageProcessor } from '../../../../core/enex/image-processor'
import type { EnexResource } from '../../../../core/enex/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

type ImageProcessorStub = {
  upload: SinonStub
}

describe('ContentConverter', () => {
  let converter: ContentConverter
  let mockImageProcessor: ImageProcessorStub

  beforeEach(() => {
    mockImageProcessor = {
      upload: cy.stub().resolves('https://example.com/image.png')
    }
    converter = new ContentConverter(mockImageProcessor as unknown as ImageProcessor)
  })

  it('converts basic ENML to HTML', async () => {
    const enml = '<en-note><div>Hello World</div></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')

    // normalizeDivsToP converts simple divs to p tags
    expect(result).to.contain('<p>Hello World</p>')
    expect(result).not.to.contain('<en-note>')
  })

  it('replaces unsupported tags', async () => {
    const enml = '<en-note><table border="1"><tr><td>Cell</td></tr></table></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')

    expect(result).to.contain('[Unsupported content: Table]')
    // DOMPurify strips the table tags, div with display:none is kept as div (special marker)
    expect(result).to.contain('<div style="display:none">Cell</div>')
  })

  it('processes images', async () => {
    const enml = '<en-note><div><en-media hash="123" type="image/png" /></div></en-note>'
    const resources: EnexResource[] = [{
      data: 'base64data',
      mime: 'image/png',
      width: 100,
      height: 100,
      hash: '123'
    }]

    const result = await converter.convert(enml, resources, 'user1', 'note1')

    expect(mockImageProcessor.upload).to.have.been.calledWith(
      'base64data',
      'image/png',
      'user1',
      'note1',
      'image_0'
    )
    // Image is wrapped in p (div with inline content is converted to p)
    expect(result).to.contain('<img src="https://example.com/image.png"')
  })

  it('handles failed image uploads', async () => {
    mockImageProcessor.upload.rejects(new Error('Upload failed'))
    
    const enml = '<en-note><en-media hash="123" /></en-note>'
    const resources: EnexResource[] = [{
      data: 'base64data',
      mime: 'image/png',
      hash: '123'
    }]

    const result = await converter.convert(enml, resources, 'user1', 'note1')
    
    // Should fall back to base64 if upload fails
    expect(result).to.contain('data:image/png;base64,base64data')
  })

  it('sanitizes HTML', async () => {
    const enml = '<en-note><script>alert("xss")</script><div>Safe</div></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')

    expect(result).not.to.contain('<script>')
    // normalizeDivsToP converts simple divs (with only inline content) to p tags
    expect(result).to.contain('<p>Safe</p>')
  })
  
  it('allows specific styles', async () => {
    const enml = '<en-note><span style="color: #ff0000; font-weight: bold;">Red Bold</span></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')
    
    // Check for style attribute presence and content loosely
    expect(result).to.contain('style="')
    expect(result).to.contain('color')
    expect(result).to.contain('#ff0000')
    expect(result).to.contain('font-weight')
    expect(result).to.contain('bold')
  })
})
