import DOMPurify from 'isomorphic-dompurify'

import { ImageProcessor } from './image-processor'
import type { EnexResource } from './types'

export class ContentConverter {
  private readonly imageProcessor: ImageProcessor
  private readonly CONCURRENCY_LIMIT = 5

  constructor(imageProcessor: ImageProcessor) {
    this.imageProcessor = imageProcessor
  }

  async convert(html: string, resources: EnexResource[] = [], userId: string, noteId: string): Promise<string> {
    let converted = html
    converted = this.replaceUnsupported(converted)
    converted = await this.processImages(converted, resources, userId, noteId)
    converted = this.cleanupENML(converted)

    // Sanitize HTML to prevent XSS attacks
    type DomPurifyConfig = Parameters<typeof DOMPurify.sanitize>[1]

    const sanitizeOptions: DomPurifyConfig & {
      ALLOWED_STYLES?: Record<string, Record<string, RegExp[]>>
    } = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'img', 'a', 'div', 'span', 'blockquote', 'code',
        'hr', 's', 'sub', 'sup'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
      ALLOWED_STYLES: {
        '*': {
          'color': [/^#[0-9a-f]{3,6}$/i],
          'background-color': [/^#[0-9a-f]{3,6}$/i],
          'text-align': [/^(left|right|center|justify)$/],
          'font-size': [/^\d+(px|em|rem|%)$/],
          'font-weight': [/^(normal|bold|\d{3})$/]
        }
      }
    }

    const sanitized: string | { toString(): string } = DOMPurify.sanitize(converted, sanitizeOptions)
    converted = typeof sanitized === 'string' ? sanitized : sanitized.toString()

    return converted
  }

  private replaceUnsupported(html: string): string {
    const replacements: Record<string, string> = {
      '<table': '[Unsupported content: Table]<div style="display:none"><table',
      '</table>': '</table></div>',
      '<pre': '[Unsupported content: Code Block]<div style="display:none"><pre',
      '</pre>': '</pre></div>',
      '<en-todo': '[Unsupported content: Checkbox]<div style="display:none"><en-todo',
      '</en-todo>': '</en-todo></div>',
      '<en-crypt': '[Unsupported content: Encrypted Text]<div style="display:none"><en-crypt',
      '</en-crypt>': '</en-crypt></div>'
    }

    let result = html
    for (const [pattern, replacement] of Object.entries(replacements)) {
      result = result.replace(new RegExp(pattern, 'gi'), replacement)
    }

    return result
  }

  private async processImages(html: string, resources: EnexResource[], userId: string, noteId: string): Promise<string> {
    if (!resources || resources.length === 0) return html

    const uploadedUrls: Array<string | null> = []

    // Process images in batches to limit concurrency
    for (let i = 0; i < resources.length; i += this.CONCURRENCY_LIMIT) {
      const batch = resources.slice(i, i + this.CONCURRENCY_LIMIT)

      const batchResults = await Promise.all(
        batch.map(async (resource, batchIndex) => {
          try {
            const url = await this.imageProcessor.upload(
              resource.data,
              resource.mime,
              userId,
              noteId,
              `image_${i + batchIndex}`
            )
            return url
          } catch (error) {
            console.error('Failed to upload image:', error)
            return null
          }
        })
      )

      uploadedUrls.push(...batchResults)
    }

    // Replace <en-media> tags with <img> tags
    let result = html
    let mediaIndex = 0

    result = result.replace(/<en-media[^>]*\/>/gi, () => {
      const url = uploadedUrls[mediaIndex]
      mediaIndex++
      if (url) {
        return `<img src="${url}" alt="Image ${mediaIndex}" />`
      }
      return '[Image failed to upload]'
    })

    return result
  }

  private cleanupENML(html: string): string {
    return html
      .replace(/<en-note[^>]*>/gi, '<div>')
      .replace(/<\/en-note>/gi, '</div>')
  }
}
