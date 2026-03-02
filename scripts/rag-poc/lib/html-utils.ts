import { parse } from 'node-html-parser'
import { RAG_CONFIG } from '../config'

export function stripHtml(html: string): string {
  if (!html) return ''
  const root = parse(html)
  const text = root.textContent.replace(/\s+/g, ' ').trim()
  return text.slice(0, RAG_CONFIG.maxContentChars)
}
