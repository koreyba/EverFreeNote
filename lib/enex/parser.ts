import type { EnexResource, ParsedNote } from './types'

export class EnexParser {
  async parse(file: File): Promise<ParsedNote[]> {
    try {
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')

      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Invalid XML format')
      }

      const notes = doc.querySelectorAll('note')
      return Array.from(notes).map((note) => this.parseNote(note))
    } catch (error: any) {
      throw new Error(`Failed to parse .enex file: ${error.message}`)
    }
  }

  private parseNote(noteElement: Element): ParsedNote {
    const title = noteElement.querySelector('title')?.textContent || 'Untitled'
    const contentCDATA = noteElement.querySelector('content')?.textContent || ''
    const content = this.extractContentFromCDATA(contentCDATA)
    const created = this.parseDate(noteElement.querySelector('created')?.textContent)
    const updated = this.parseDate(noteElement.querySelector('updated')?.textContent)
    const tags = Array.from(noteElement.querySelectorAll('tag'))
      .map((tag) => tag.textContent?.trim() ?? '')
      .filter(Boolean)
    const resources = this.parseResources(noteElement)

    return { title, content, created, updated, tags, resources }
  }

  private extractContentFromCDATA(cdata: string): string {
    const match = cdata.match(/<en-note[^>]*>([\s\S]*)<\/en-note>/)
    return match ? match[1] : cdata
  }

  private parseDate(dateString?: string | null): Date {
    if (!dateString) return new Date()
    const year = dateString.substring(0, 4)
    const month = dateString.substring(4, 6)
    const day = dateString.substring(6, 8)
    const hour = dateString.substring(9, 11)
    const minute = dateString.substring(11, 13)
    const second = dateString.substring(13, 15)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  }

  private parseResources(noteElement: Element): EnexResource[] {
    const resources = noteElement.querySelectorAll('resource')
    return Array.from(resources).map((resource) => {
      const data = resource.querySelector('data')?.textContent || ''
      const mime = resource.querySelector('mime')?.textContent || 'image/png'
      const width = resource.querySelector('width')?.textContent
      const height = resource.querySelector('height')?.textContent
      const fileName = resource.querySelector('file-name')?.textContent

      return {
        data: data.trim(),
        mime,
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        fileName: fileName ?? undefined,
      }
    })
  }
}
