import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'

export class ImageProcessor {
  private readonly supabase: SupabaseClient<Database>
  private readonly bucket = 'note-images'
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB per image

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  async upload(base64: string, mime: string, userId: string, noteId: string, fileName: string): Promise<string> {
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

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, blob, {
          contentType: mime,
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      return publicUrlData.publicUrl
    } catch (error: unknown) {
      console.error('Image upload failed:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to upload image: ${message}`)
    }
  }

  private base64ToBlob(base64: string, mime: string): Blob {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Blob([bytes], { type: mime })
  }
}
