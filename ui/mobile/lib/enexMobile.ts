import type { ParsedNote } from '@core/enex/types'
import type { Tables } from '@/supabase/types'
import type { ExportNote } from '@core/enex/export-types'
import { XMLParser } from 'fast-xml-parser'

type NoteRow = Tables<'notes'>

type ParsedEnexDocument = {
  'en-export'?: {
    note?: ParsedEnexNote | ParsedEnexNote[]
  }
}

type ParsedEnexNote = {
  title?: string
  content?: string | { '#text'?: string }
  created?: string
  updated?: string
  tag?: string | string[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: false,
})

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const parseEnexDate = (value?: string | null): Date => {
  if (!value) return new Date()

  const trimmed = value.trim()
  if (!trimmed) return new Date()

  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (!match) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }

  const [, year, month, day, hour, minute, second] = match
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
}

export const extractEnexContent = (value: string): string => {
  const match = value.match(/<en-note[^>]*>([\s\S]*)<\/en-note>/i)
  const content = match ? match[1] : value

  return content
    .replace(/<en-media\b[^>]*\/>/gi, '<p>[Imported media placeholder]</p>')
    .replace(/<en-media\b[^>]*>[\s\S]*?<\/en-media>/gi, '<p>[Imported media placeholder]</p>')
    .trim()
}

export const parseEnexXml = (xml: string): ParsedNote[] => {
  const parsed = parser.parse(xml) as ParsedEnexDocument
  const notes = asArray(parsed['en-export']?.note)

  return notes.map((note) => {
    const rawContent =
      typeof note.content === 'string'
        ? note.content
        : typeof note.content?.['#text'] === 'string'
          ? note.content['#text']
          : ''
    const trimmedTitle = note.title?.trim()

    return {
      title: trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : 'Untitled',
      content: extractEnexContent(rawContent),
      created: parseEnexDate(note.created),
      updated: parseEnexDate(note.updated ?? note.created),
      tags: asArray(note.tag)
        .map((tag) => tag.trim())
        .filter(Boolean),
      resources: [],
    }
  })
}

export const buildEnexExportFileName = (date: Date = new Date()) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `everfreenote-export-${year}${month}${day}-${hours}${minutes}${seconds}.enex`
}

export const toEnexExportNotes = (notes: NoteRow[]): ExportNote[] =>
  notes.map((note) => ({
    title: note.title ?? 'Untitled',
    content: note.description ?? '',
    created: new Date(note.created_at),
    updated: new Date(note.updated_at ?? note.created_at),
    tags: note.tags ?? [],
    resources: [],
  }))
