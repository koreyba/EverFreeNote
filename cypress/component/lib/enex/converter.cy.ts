import { ContentConverter } from '../../../../lib/enex/converter'
import { ImageProcessor } from '../../../../lib/enex/image-processor'
import type { EnexResource } from '../../../../lib/enex/types'

interface CypressStub<TArgs extends any[] = any[], TResult = any> {
  (...args: TArgs): TResult
  resolves(value: TResult): this
  rejects(reason?: any): this
}

type ImageProcessorStub = {
  upload: CypressStub<any[], string>
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
    
    expect(result).to.contain('<div>Hello World</div>')
    expect(result).not.to.contain('<en-note>')
  })

  it('replaces unsupported tags', async () => {
    const enml = '<en-note><table border="1"><tr><td>Cell</td></tr></table></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')
    
    expect(result).to.contain('[Unsupported content: Table]')
    // DOMPurify strips the table tags but keeps the content inside the hidden div
    expect(result).to.contain('<div style="display:none">Cell</div>')
  })

  it('processes images', async () => {
    const enml = '<en-note><div><en-media hash="123" type="image/png" /></div></en-note>'
    const resources: EnexResource[] = [{
      data: 'base64data',
      mime: 'image/png',
      width: 100,
      height: 100
    }]

    const result = await converter.convert(enml, resources, 'user1', 'note1')
    
    expect(mockImageProcessor.upload).to.have.been.calledWith(
      'base64data',
      'image/png',
      'user1',
      'note1',
      'image_0'
    )
    expect(result).to.contain('<img src="https://example.com/image.png"')
  })

  it('handles failed image uploads', async () => {
    mockImageProcessor.upload.rejects(new Error('Upload failed'))
    
    const enml = '<en-note><en-media hash="123" /></en-note>'
    const resources: EnexResource[] = [{
      data: 'base64data',
      mime: 'image/png'
    }]

    const result = await converter.convert(enml, resources, 'user1', 'note1')
    
    expect(result).to.contain('[Image failed to upload]')
  })

  it('sanitizes HTML', async () => {
    const enml = '<en-note><script>alert("xss")</script><div>Safe</div></en-note>'
    const result = await converter.convert(enml, [], 'user1', 'note1')
    
    expect(result).not.to.contain('<script>')
    expect(result).to.contain('<div>Safe</div>')
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
