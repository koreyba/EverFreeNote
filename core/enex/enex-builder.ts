import { formatEvernoteDate } from './date-formatter'
import type { ExportNote, ExportResource } from './export-types'

export class EnexBuilder {
  build(notes: ExportNote[], exportDate: Date = new Date()): string {
    const formattedExportDate = formatEvernoteDate(exportDate)
    const noteXml = notes.map((note) => this.buildNote(note)).join('')

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">',
      `<en-export export-date="${formattedExportDate}" application="EverFreeNote" version="1.0">`,
      noteXml,
      '</en-export>',
    ].join('\n')
  }

  private buildNote(note: ExportNote): string {
    const title = this.escapeXml(note.title)
    const created = formatEvernoteDate(note.created)
    const updated = formatEvernoteDate(note.updated)
    const tagsXml = this.buildTags(note.tags)
    const content = this.buildContent(note.content)
    const resourcesXml = this.buildResources(note.resources)

    return [
      '<note>',
      `<title>${title}</title>`,
      `<content>${content}</content>`,
      `<created>${created}</created>`,
      `<updated>${updated}</updated>`,
      tagsXml,
      resourcesXml,
      '</note>',
    ].join('\n')
  }

  private buildTags(tags: string[]): string {
    if (!tags || tags.length === 0) return ''
    const sorted = [...tags].sort((a, b) => a.localeCompare(b))
    return sorted.map((tag) => `<tag>${this.escapeXml(tag)}</tag>`).join('\n')
  }

  private buildContent(enml: string): string {
    return [
      '<![CDATA[<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">',
      `<en-note>${enml}</en-note>`,
      ']]>',
    ].join('\n')
  }

  private buildResources(resources: ExportResource[]): string {
    if (!resources || resources.length === 0) return ''
    return resources.map((resource) => this.buildResource(resource)).join('\n')
  }

  private buildResource(resource: ExportResource): string {
    const width = resource.width ? `<width>${resource.width}</width>` : ''
    const height = resource.height ? `<height>${resource.height}</height>` : ''
    const fileName = resource.fileName
      ? `<resource-attributes><file-name>${this.escapeXml(resource.fileName)}</file-name></resource-attributes>`
      : ''

    return [
      '<resource>',
      `<data encoding="base64">${resource.data}</data>`,
      `<mime>${this.escapeXml(resource.mime)}</mime>`,
      width,
      height,
      fileName,
      '</resource>',
    ]
      .filter(Boolean)
      .join('\n')
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
