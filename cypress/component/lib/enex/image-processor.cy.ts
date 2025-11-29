import { ImageProcessor } from '../../../../lib/enex/image-processor'
import type { SupabaseClient } from '@supabase/supabase-js'

type UploadResponse = { data: { path: string } | null; error: null | { message: string } }
type PublicUrlResponse = { data: { publicUrl: string | null } }

interface CypressStub<TArgs extends any[] = any[], TResult = any> {
  (...args: TArgs): TResult
  resolves(value: TResult): this
  rejects(reason?: any): this
  getCall(index: number): { args: any[] }
  returns(value: TResult): this
}

type SupabaseStorageStub = {
  from: () => SupabaseStorageStub
  upload: CypressStub<any[], UploadResponse>
  getPublicUrl: CypressStub<any[], PublicUrlResponse>
}

type SupabaseClientStub = {
  storage: SupabaseStorageStub
}

describe('ImageProcessor', () => {
  let processor: ImageProcessor
  let mockSupabase: SupabaseClientStub
  let mockStorage: SupabaseStorageStub

  beforeEach(() => {
    mockStorage = {
      from: cy.stub().returnsThis(),
      upload: cy.stub().resolves({ data: { path: 'path/to/image' }, error: null }),
      getPublicUrl: cy.stub().returns({ data: { publicUrl: 'https://example.com/image.png' } })
    }

    mockSupabase = {
      storage: mockStorage
    }

    processor = new ImageProcessor(mockSupabase as unknown as SupabaseClient)
  })

  it('uploads an image successfully', async () => {
    const base64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' // 1x1 GIF
    const mime = 'image/gif'
    const userId = 'user1'
    const noteId = 'note1'
    const fileName = 'pixel'

    const url = await processor.upload(base64, mime, userId, noteId, fileName)

    expect(url).to.equal('https://example.com/image.png')
    expect(mockStorage.from).to.have.been.calledWith('note-images')
    expect(mockStorage.upload).to.have.been.called
    
    // Verify upload arguments
    const uploadCall = mockStorage.upload.getCall(0)
    const [path, blob, options] = uploadCall.args
    expect(path).to.contain(`${userId}/${noteId}/`)
    expect(path).to.contain(fileName)
    expect(blob).to.be.instanceOf(Blob)
    expect(blob.type).to.equal(mime)
    expect(options.contentType).to.equal(mime)
  })

  it('throws error if image is too large', async () => {
    // Create a large base64 string (mocking logic since we can't easily create 10MB string here without memory issues)
    // Instead, we can spy on base64ToBlob or just create a blob that reports a large size?
    // But base64ToBlob is private.
    // We can try to override the MAX_IMAGE_SIZE if it was public or protected, but it's private.
    
    // Alternatively, we can mock Blob constructor? No, that's global.
    
    // Let's try to create a string that results in > 10MB blob.
    // 10MB = 10 * 1024 * 1024 bytes.
    // Base64 is ~1.33x larger. So ~13.3MB string.
    // That might be slow in a test.
    
    // Maybe we can skip this test or try to mock the private method if we cast to any.
    
      const processorAny = processor as unknown as { base64ToBlob: () => { size: number } }
      const originalBase64ToBlob = processorAny.base64ToBlob
      processorAny.base64ToBlob = () => ({ size: 11 * 1024 * 1024 })

    try {
      await processor.upload('data', 'image/png', 'u', 'n', 'f')
      expect.fail('Should have thrown error')
    } catch (error: unknown) {
      const err = error as Error
      expect(err.message).to.contain('Image too large')
    } finally {
      processorAny.base64ToBlob = originalBase64ToBlob
    }
  })

  it('throws error on upload failure', async () => {
    mockStorage.upload.resolves({ data: null, error: { message: 'Storage error' } })

    try {
      await processor.upload('data', 'image/png', 'u', 'n', 'f')
      expect.fail('Should have thrown error')
    } catch (error: unknown) {
      const err = error as Error
      expect(err.message).to.contain('Storage error')
    }
  })

  it('throws error on missing public URL', async () => {
    mockStorage.getPublicUrl.returns({ data: { publicUrl: null } })

    try {
      await processor.upload('data', 'image/png', 'u', 'n', 'f')
      expect.fail('Should have thrown error')
    } catch (error: unknown) {
      const err = error as Error
      expect(err.message).to.contain('Failed to get public URL')
    }
  })
})
