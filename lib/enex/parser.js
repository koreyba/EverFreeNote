export class EnexParser {
  async parse(file) {
    try {
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')

      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Invalid XML format')
      }

      const notes = doc.querySelectorAll('note')
      return Array.from(notes).map(note => this.parseNote(note))
    } catch (error) {
      throw new Error(`Failed to parse .enex file: ${error.message}`)
    }
  }

  parseNote(noteElement) {
    const title = noteElement.querySelector('title')?.textContent || 'Untitled'
    const contentCDATA = noteElement.querySelector('content')?.textContent || ''
    const content = this.extractContentFromCDATA(contentCDATA)
    const created = this.parseDate(noteElement.querySelector('created')?.textContent)
    const updated = this.parseDate(noteElement.querySelector('updated')?.textContent)
    const tags = Array.from(noteElement.querySelectorAll('tag'))
      .map(tag => tag.textContent.trim())
      .filter(Boolean)
    const resources = this.parseResources(noteElement)

    return { title, content, created, updated, tags, resources }
  }

  extractContentFromCDATA(cdata) {
    const match = cdata.match(/<en-note[^>]*>([\s\S]*)<\/en-note>/)
    return match ? match[1] : cdata
  }

  parseDate(dateString) {
    if (!dateString) return new Date()
    const year = dateString.substr(0, 4)
    const month = dateString.substr(4, 2)
    const day = dateString.substr(6, 2)
    const hour = dateString.substr(9, 2)
    const minute = dateString.substr(11, 2)
    const second = dateString.substr(13, 2)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  }

  parseResources(noteElement) {
    const resources = noteElement.querySelectorAll('resource')
    return Array.from(resources).map(resource => {
      const data = resource.querySelector('data')?.textContent || ''
      const mime = resource.querySelector('mime')?.textContent || 'image/png'
      const width = resource.querySelector('width')?.textContent
      const height = resource.querySelector('height')?.textContent
      const fileName = resource.querySelector('file-name')?.textContent

      return {
        data: data.trim(),
        mime,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        fileName
      }
    })
  }
}

