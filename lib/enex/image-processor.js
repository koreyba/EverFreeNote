import { createClient } from '@/lib/supabase/client'

export class ImageProcessor {
  constructor() {
    this.supabase = createClient()
    this.bucket = 'note-images'
    this.MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB per image
  }

  async upload(base64, mime, userId, noteId, fileName) {
    try {
      const blob = this.base64ToBlob(base64, mime)
      
      // Validate image size
      if (blob.size > this.MAX_IMAGE_SIZE) {
        const sizeMB = (blob.size / 1024 / 1024).toFixed(1)
        throw new Error(`Image too large: ${sizeMB}MB (max 10MB)`)
      }
      
      const ext = mime.split('/')[1] || 'png'
      const timestamp = Date.now()
      const path = `${userId}/${noteId}/${timestamp}_${fileName}.${ext}`

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, blob, {
          contentType: mime,
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)

      return publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }
  }

  base64ToBlob(base64, mime) {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Blob([bytes], { type: mime })
  }
}
