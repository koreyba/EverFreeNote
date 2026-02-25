import MarkdownIt from 'markdown-it'
import { SanitizationService } from '@core/services/sanitizer'
import { normalizeHtml, plainTextToHtml } from '@core/utils/normalize-html'

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
// Matches HTML that is exactly one <p>...</p> element (used to unwrap ProseMirror clipboard wrappers).
const SINGLE_PARAGRAPH_PATTERN = /^<p[^>]*>([\s\S]*)<\/p>$/i
const BLOCK_ELEMENT_PATTERN = /<(p|div|ul|ol|li|h[1-6]|blockquote|pre|table|hr)[\s>/]/i

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

  resolvePaste(
    payload: PastePayload,
    options: SmartPasteOptions = {},
    forcedType?: PasteType,
  ): PasteResult {
    const config = { ...DEFAULT_OPTIONS, ...options }
    const detection: PasteDetection = forcedType
      ? { type: forcedType, confidence: 1.0, reasons: ['forced-by-user'], warnings: [] }
      : SmartPasteService.detectPasteType(payload, config)
    return resolvePasteInternal(payload, detection, config)
  },
}

function resolvePasteInternal(
  payload: PastePayload,
  detection: PasteDetection,
  config: Required<SmartPasteOptions>,
): PasteResult {
  const warnings = [...detection.warnings]

  try {
    if (detection.type === 'html' && payload.html) {
      const sanitized = sanitizePasteHtml(payload.html)
      const html = unwrapSingleParagraph(sanitized)
      return { html, type: 'html', warnings, detection }
    }

    if (detection.type === 'markdown' && payload.text) {
      if (payload.text.length > config.maxLength) {
        warnings.push('plain:oversized-text')
        const html = plainTextToHtml(payload.text)
        return { html: sanitizePasteHtml(html), type: 'plain', warnings, detection }
      }

      if (containsUnsupportedMarkdown(payload.text)) {
        warnings.push('plain:unsupported-markdown')
        // Fallback to plain text wrapper without stripping characters (Strategy 2)
        const html = plainTextToHtml(payload.text)
        return { html: sanitizePasteHtml(html), type: 'plain', warnings, detection }
      }

      const rendered = markdown.render(payload.text)
      return { html: sanitizePasteHtml(rendered), type: 'markdown', warnings, detection }
    }

    const text = payload.text ?? SanitizationService.stripHtml(payload.html ?? '')
    const plainHtml = plainTextToHtml(text)
    return { html: sanitizePasteHtml(plainHtml), type: 'plain', warnings, detection }
  } catch {
    warnings.push('plain:parse-failed')
    const fallbackText = payload.text ?? safeStripHtml(payload.html ?? '')
    const fallbackHtml = plainTextToHtml(fallbackText)
    return { html: fallbackHtml, type: 'plain', warnings, detection }
  }
}

function safeStripHtml(html: string): string {
  try {
    return SanitizationService.stripHtml(html)
  } catch {
    return ''
  }
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

function unwrapSingleParagraph(html: string): string {
  const trimmed = html.trim()
  const match = trimmed.match(SINGLE_PARAGRAPH_PATTERN)
  if (!match) return html

  const inner = match[1]
  // Don't unwrap if inner content has block elements.
  // For multi-paragraph input the greedy regex captures "First</p><p>Second"
  // as inner — BLOCK_ELEMENT_PATTERN detects the nested <p> and bails out.
  if (BLOCK_ELEMENT_PATTERN.test(inner)) return html

  return inner
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
    // Regex fallback for environments without DOMParser (e.g. React Native)
    return html.replace(/\s(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (match, attr, val1, val2) => {
      const val = val1 || val2 || ''
      const isAllowed =
        attr.toLowerCase() === 'href'
          ? isAllowedLinkProtocol(val, ALLOWED_LINK_PROTOCOLS)
          : isAllowedImageProtocol(val, ALLOWED_IMAGE_PROTOCOLS)
      return isAllowed ? match : ''
    })
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const links = Array.from(doc.querySelectorAll('a[href]'))
  for (const link of links) {
    const href = link.getAttribute('href') ?? ''
    if (!isAllowedLinkProtocol(href, ALLOWED_LINK_PROTOCOLS)) {
      link.removeAttribute('href')
    }
  }

  const images = Array.from(doc.querySelectorAll('img[src]'))
  for (const img of images) {
    const src = img.getAttribute('src') ?? ''
    if (!isAllowedImageProtocol(src, ALLOWED_IMAGE_PROTOCOLS)) {
      img.remove()
    }
  }

  return doc.body.innerHTML
}

function isAllowedLinkProtocol(value: string, allowed: string[]): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('//')) {
    return false
  }
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('?')
  ) {
    return true
  }
  try {
    const parsed = new URL(trimmed)
    return allowed.includes(parsed.protocol)
  } catch {
    return false
  }
}

function isAllowedImageProtocol(value: string, allowed: string[]): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('//')) {
    return false
  }
  try {
    const parsed = new URL(trimmed)
    return allowed.includes(parsed.protocol)
  } catch {
    return false
  }
}
