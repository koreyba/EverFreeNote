export class ContentConverter {
  constructor(imageProcessor) {
    this.imageProcessor = imageProcessor
  }

  async convert(html, resources, userId, noteId) {
    let converted = html
    converted = this.replaceUnsupported(converted)
    converted = await this.processImages(converted, resources, userId, noteId)
    converted = this.cleanupENML(converted)
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

    const uploadPromises = resources.map(async (resource, index) => {
      try {
        const url = await this.imageProcessor.upload(
          resource.data,
          resource.mime,
          userId,
          noteId,
          `image_${index}`
        )
        return url
      } catch (error) {
        console.error('Failed to upload image:', error)
        return null
      }
    })

    const uploadedUrls = await Promise.all(uploadPromises)

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

