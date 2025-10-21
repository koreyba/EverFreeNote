import DOMPurify from 'isomorphic-dompurify'

export class ContentConverter {
  constructor(imageProcessor) {
    this.imageProcessor = imageProcessor
    this.CONCURRENCY_LIMIT = 5 // Max 5 concurrent image uploads
  }

  async convert(html, resources, userId, noteId) {
    let converted = html
    converted = this.replaceUnsupported(converted)
    converted = await this.processImages(converted, resources, userId, noteId)
    converted = this.cleanupENML(converted)
    
    // Sanitize HTML to prevent XSS attacks
    converted = DOMPurify.sanitize(converted, {
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
    })
    
    return converted
  }

  replaceUnsupported(html) {
    const replacements = {
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

  async processImages(html, resources, userId, noteId) {
    if (!resources || resources.length === 0) return html

    const uploadedUrls = []

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

    result = result.replace(/<en-media[^>]*\/>/gi, (match) => {
      const url = uploadedUrls[mediaIndex]
      mediaIndex++
      if (url) {
        return `<img src="${url}" alt="Image ${mediaIndex}" />`
      } else {
        return '[Image failed to upload]'
      }
    })

    return result
  }

  cleanupENML(html) {
    return html
      .replace(/<en-note[^>]*>/gi, '<div>')
      .replace(/<\/en-note>/gi, '</div>')
  }
}
