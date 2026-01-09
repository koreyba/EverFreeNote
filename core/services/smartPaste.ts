import MarkdownIt from 'markdown-it'
import { SanitizationService } from '@core/services/sanitizer'
import { normalizeHtml } from '@core/utils/normalize-html'

export type PasteType = 'html' | 'markdown' | 'plain'

export type PastePayload = {
  html: string | null
  text: string | null
  types: string[]
  sourceHint?: string
}

export type PasteDetection = {
  type: PasteType
  confidence: number
  reasons: string[]
  warnings: string[]
}

export type PasteResult = {
  html: string
  type: PasteType
  warnings: string[]
  detection: PasteDetection
}

export type SmartPasteOptions = {
  maxLength?: number
  markdownScoreThreshold?: number
}

const DEFAULT_OPTIONS: Required<SmartPasteOptions> = {
  maxLength: 100_000,
  markdownScoreThreshold: 3,
}

const STRUCTURAL_TAG_PATTERN = /<(p|br|hr|ul|ol|li|h1|h2|h3|h4|h5|h6|blockquote|pre|code|img|a)(\s|>|\/)/i
const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']
const ALLOWED_IMAGE_PROTOCOLS = ['http:', 'https:']
// Exclude colors to avoid theme clashes from sources like Google Docs.
const STYLE_ALLOWLIST = new Set(['font-weight', 'font-style', 'text-decoration'])

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
})
markdown.disable(['table'])

export const SmartPasteService = {
  buildPayload(event: ClipboardEvent): PastePayload {
    const clipboard = event.clipboardData
    const html = clipboard?.getData('text/html') ?? ''
    const text = clipboard?.getData('text/plain') ?? ''
    return {
      html: html.trim().length ? html : null,
      text: text.length ? text : null,
      types: Array.from(clipboard?.types ?? []),
    }
  },

  detectPasteType(payload: PastePayload, options: SmartPasteOptions = {}): PasteDetection {
    const config = { ...DEFAULT_OPTIONS, ...options }
    const reasons: string[] = []
    const warnings: string[] = []
    const html = payload.html ?? ''
    const text = payload.text ?? ''

    if (html && isHtmlMeaningful(html)) {
      reasons.push('html:meaningful-structure')
      return { type: 'html', confidence: 1, reasons, warnings }
    }

    if (!text) {
      reasons.push('plain:empty-text')
      return { type: 'plain', confidence: 0.5, reasons, warnings }
    }

    if (text.length > config.maxLength) {
      warnings.push('plain:oversized-text')
      return { type: 'plain', confidence: 0.6, reasons, warnings }
    }

    const score = scoreMarkdown(text)
    if (score.score >= config.markdownScoreThreshold) {
      reasons.push(...score.reasons)
      return { type: 'markdown', confidence: score.score / (config.markdownScoreThreshold + 2), reasons, warnings }
    }

    reasons.push('plain:low-markdown-score')
    return { type: 'plain', confidence: 0.6, reasons, warnings }
  },

  resolvePaste(payload: PastePayload, options: SmartPasteOptions = {}): PasteResult {
    const config = { ...DEFAULT_OPTIONS, ...options }
    const detection = SmartPasteService.detectPasteType(payload, config)
    const warnings = [...detection.warnings]

    if (detection.type === 'html' && payload.html) {
      const sanitized = sanitizePasteHtml(payload.html)
      return { html: sanitized, type: 'html', warnings, detection }
    }

    if (detection.type === 'markdown' && payload.text) {
      if (payload.text.length > config.maxLength) {
        warnings.push('plain:oversized-text')
        const html = plainTextToHtml(payload.text)
        return { html: sanitizePasteHtml(html), type: 'plain', warnings, detection }
      }

      if (containsUnsupportedMarkdown(payload.text)) {
        warnings.push('plain:unsupported-markdown')
        const cleaned = stripMarkdownSyntax(payload.text)
        const html = plainTextToHtml(cleaned)
        return { html: sanitizePasteHtml(html), type: 'plain', warnings, detection }
      }

      const rendered = markdown.render(payload.text)
      return { html: sanitizePasteHtml(rendered), type: 'markdown', warnings, detection }
    }

    const text = payload.text ?? SanitizationService.stripHtml(payload.html ?? '')
    const plainHtml = plainTextToHtml(text)
    return { html: sanitizePasteHtml(plainHtml), type: 'plain', warnings, detection }
  },
}

function isHtmlMeaningful(html: string): boolean {
  return STRUCTURAL_TAG_PATTERN.test(html)
}

function scoreMarkdown(text: string): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (/^#{1,6}\s+/m.test(text)) {
    score += 3
    reasons.push('markdown:heading')
  }

  if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/m.test(text)) {
    score += 2
    reasons.push('markdown:list')
  }

  if (/^\s*>\s+/m.test(text)) {
    score += 2
    reasons.push('markdown:blockquote')
  }

  if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(text)) {
    score += 3
    reasons.push('markdown:horizontal-rule')
  }

  if (/^\s*```|^\s*~~~/m.test(text)) {
    score += 3
    reasons.push('markdown:fenced-code')
  }

  if (/`[^`]+`/.test(text)) {
    score += 1
    reasons.push('markdown:inline-code')
  }

  if (/\[[^\]]+\]\([^)]+\)/.test(text)) {
    score += 1
    reasons.push('markdown:link')
  }

  if (/\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~/.test(text)) {
    score += 1
    reasons.push('markdown:emphasis')
  }

  return { score, reasons }
}

function containsUnsupportedMarkdown(text: string): boolean {
  if (/^\s*[-*+]\s+\[[ xX]\]\s+/m.test(text)) {
    return true
  }

  if (/^\s*\|?.+\|.+\n\s*\|?\s*[-:]+\s*\|/m.test(text)) {
    return true
  }

  return false
}

function stripMarkdownSyntax(text: string): string {
  let result = text

  result = result.replace(/^\s*```.*$/gm, '')
  result = result.replace(/^\s*~~~.*$/gm, '')
  result = result.replace(/^\s*#{1,6}\s+/gm, '')
  result = result.replace(/^\s*>\s?/gm, '')
  result = result.replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '- ')
  result = result.replace(/^\s*[-*+]\s+/gm, '')
  result = result.replace(/^\s*\d+\.\s+/gm, '')
  result = result.replace(/\|/g, ' ')

  result = result.replace(/~~([^~]+)~~/g, '$1')
  result = result.replace(/(\*\*|__)([^*_]+)\1/g, '$2')
  result = result.replace(/(\*|_)([^*_]+)\1/g, '$2')
  result = result.replace(/`([^`]+)`/g, '$1')

  return result
}

function sanitizePasteHtml(html: string): string {
  const sanitized = SanitizationService.sanitize(html)
  const withoutStyles = filterInlineStyles(sanitized)
  const withoutBadLinks = filterUnsafeUrls(withoutStyles)
  return normalizeHtml(withoutBadLinks)
}

function filterInlineStyles(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/\sstyle="[^"]*"/gi, '')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const styled = Array.from(doc.querySelectorAll('[style]'))
  for (const element of styled) {
    const styleValue = element.getAttribute('style') ?? ''
    const allowed = styleValue
      .split(';')
      .map(entry => entry.trim())
      .filter(Boolean)
      .map(entry => {
        const [property, ...rest] = entry.split(':')
        if (!property) return null
        const name = property.trim().toLowerCase()
        if (!STYLE_ALLOWLIST.has(name)) return null
        const value = rest.join(':').trim()
        return value ? `${name}: ${value}` : null
      })
      .filter((entry): entry is string => Boolean(entry))

    if (allowed.length === 0) {
      element.removeAttribute('style')
    } else {
      element.setAttribute('style', allowed.join('; '))
    }
  }

  return doc.body.innerHTML
}

function filterUnsafeUrls(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const links = Array.from(doc.querySelectorAll('a[href]'))
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    if (!isAllowedProtocol(href, ALLOWED_LINK_PROTOCOLS)) {
      link.removeAttribute('href')
    }
  }

  const images = Array.from(doc.querySelectorAll('img[src]'))
  for (const img of images) {
    const src = img.getAttribute('src') ?? ''
    if (!isAllowedProtocol(src, ALLOWED_IMAGE_PROTOCOLS)) {
      img.remove()
    }
  }

  return doc.body.innerHTML
}

function isAllowedProtocol(value: string, allowed: string[]): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return allowed.includes(parsed.protocol)
  } catch {
    return false
  }
}

function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = normalized.split(/\n{2,}/)
  return paragraphs
    .map(section => escapeHtml(section).replace(/\n/g, '<br />'))
    .map(section => `<p>${section}</p>`)
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
