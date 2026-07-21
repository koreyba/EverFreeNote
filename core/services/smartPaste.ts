import MarkdownIt from 'markdown-it'
import { NoteClipboardService } from '@core/services/noteClipboard'
import { NoteCopyService } from '@core/services/noteCopy'
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
// Editor stores inline base64 images (Image extension allowBase64). Permit them on the
// self-copy path only, so internal round-trip keeps images without weakening external paste.
const SELF_COPY_IMAGE_PROTOCOLS = [...ALLOWED_IMAGE_PROTOCOLS, 'data:']
// The self-copy marker is a plain HTML attribute, so any external page can forge it.
// Bound what `data:` is allowed to carry on that path to raster image types the editor
// itself produces (no svg+xml, which can embed scripts) and to the per-image size cap
// already used for uploads (core/enex/image-processor.ts MAX_IMAGE_SIZE), so a forged
// marker can smuggle at most an oversized image, never an arbitrary payload.
const SELF_COPY_DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,/i
const MAX_SELF_COPY_DATA_URI_LENGTH = 14_000_000 // ~10MB decoded, base64 overhead included
// Per-image cap alone doesn't bound total payload size — a forged marker could still
// carry many just-under-the-cap images. Cap the sum accepted from one paste too.
const MAX_SELF_COPY_TOTAL_DATA_URI_LENGTH = 60_000_000
// Exclude colors to avoid theme clashes from sources like Google Docs.
const GENERIC_STYLE_ALLOWLIST = new Set(['font-weight', 'font-style', 'text-decoration'])
const SELF_COPY_STYLE_ALLOWLIST = new Set([
  ...GENERIC_STYLE_ALLOWLIST,
  'background-color',
  'color',
  'font-family',
  'font-size',
  'text-align',
])
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
      const isSelfCopy = NoteCopyService.isSelfCopyHtml(payload.html)
      const sanitized = isSelfCopy
        ? sanitizePasteHtml(
            // Reverse buildPayload()'s clipboard-facing blank-line handling —
            // pasting back into EverFreeNote itself must restore the exact
            // pre-copy editor representation, not the one built for external
            // paste targets like Telegram/Facebook.
            NoteClipboardService.restoreEditorHtml(NoteCopyService.unwrapSelfCopyHtml(payload.html)),
            {
              profile: 'editor-self-copy',
              styleAllowlist: SELF_COPY_STYLE_ALLOWLIST,
              imageProtocolAllowlist: SELF_COPY_IMAGE_PROTOCOLS,
            },
          )
        : sanitizePasteHtml(payload.html)
      const html = isSelfCopy ? sanitized : unwrapSingleParagraph(sanitized)
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

  if (/^[ \t]*(?:[-*+][ \t]+|\d+\.[ \t]+)/m.test(text)) {
    score += 2
    reasons.push('markdown:list')
  }

  if (/^[ \t]*>[ \t]+/m.test(text)) {
    score += 2
    reasons.push('markdown:blockquote')
  }

  if (/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/m.test(text)) {
    score += 3
    reasons.push('markdown:horizontal-rule')
  }

  if (/^[ \t]*(?:```|~~~)/m.test(text)) {
    score += 3
    reasons.push('markdown:fenced-code')
  }

  if (/`[^`]+`/.test(text)) {
    score += 1
    reasons.push('markdown:inline-code')
  }

  if (/\[[^[\]]+\]\([^()]+\)/.test(text)) {
    score += 1
    reasons.push('markdown:link')
  }

  if (/\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~/.test(text)) {
    score += 1
    reasons.push('markdown:emphasis')
  }

  return { score, reasons }
}

function isMarkdownTableSeparatorCell(cell: string): boolean {
  const trimmedCell = cell.trim()
  let start = trimmedCell.startsWith(':') ? 1 : 0
  const end = trimmedCell.endsWith(':') ? trimmedCell.length - 1 : trimmedCell.length

  if (start >= end) return false

  while (start < end) {
    if (trimmedCell[start] !== '-') return false
    start += 1
  }
  return true
}

function isMarkdownTableSeparatorRow(line: string): boolean {
  let row = line.trim()
  if (!row.includes('|')) return false
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)

  const cells = row.split('|')
  return cells.every(isMarkdownTableSeparatorCell)
}

function containsUnsupportedMarkdown(text: string): boolean {
  if (/^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]+/m.test(text)) {
    return true
  }

  const lines = text.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i]?.trim() ?? ''
    const nextLine = lines[i + 1]?.trim() ?? ''
    if (currentLine.includes('|') && isMarkdownTableSeparatorRow(nextLine)) {
      return true
    }
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

function sanitizePasteHtml(
  html: string,
  options: {
    profile?: 'default' | 'editor-self-copy'
    styleAllowlist?: Set<string>
    imageProtocolAllowlist?: string[]
  } = {},
): string {
  const sanitized = SanitizationService.sanitize(html, { profile: options.profile ?? 'default' })
  const withoutStyles = filterInlineStyles(sanitized, options.styleAllowlist ?? GENERIC_STYLE_ALLOWLIST)
  const withoutBadLinks = filterUnsafeUrls(withoutStyles, options.imageProtocolAllowlist ?? ALLOWED_IMAGE_PROTOCOLS)
  return normalizeHtml(withoutBadLinks)
}

function filterInlineStyles(html: string, styleAllowlist: Set<string>): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/\sstyle=(?:"([^"]*)"|'([^']*)')/gi, (_match, doubleQuoted, singleQuoted) => {
      const styleValue = doubleQuoted ?? singleQuoted ?? ''
      const allowed = styleValue
        .split(';')
        .map((entry: string) => entry.trim())
        .filter(Boolean)
        .map((entry: string) => {
          const [property, ...rest] = entry.split(':')
          if (!property) return null
          const name = property.trim().toLowerCase()
          if (!styleAllowlist.has(name)) return null
          const value = rest.join(':').trim()
          return value ? `${name}: ${value}` : null
        })
        .filter((entry: string | null): entry is string => Boolean(entry))

      return allowed.length > 0 ? ` style="${allowed.join('; ')}"` : ''
    })
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
        if (!styleAllowlist.has(name)) return null
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

function filterUnsafeUrls(html: string, imageProtocols: string[] = ALLOWED_IMAGE_PROTOCOLS): string {
  // Shared across every image in this one paste, so accepted data: URIs are
  // bounded in aggregate, not just individually.
  const dataUriBudget = { remaining: MAX_SELF_COPY_TOTAL_DATA_URI_LENGTH }

  if (typeof DOMParser === 'undefined') {
    // Regex fallback for environments without DOMParser (e.g. React Native)
    return html.replace(/\s(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (match, attr, val1, val2) => {
      const val = val1 || val2 || ''
      const isAllowed =
        attr.toLowerCase() === 'href'
          ? isAllowedLinkProtocol(val, ALLOWED_LINK_PROTOCOLS)
          : isAllowedImageProtocol(val, imageProtocols, dataUriBudget)
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
    if (!isAllowedImageProtocol(src, imageProtocols, dataUriBudget)) {
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

function isAllowedImageProtocol(value: string, allowed: string[], dataUriBudget?: { remaining: number }): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('//')) {
    return false
  }
  if (/^data:/i.test(trimmed)) {
    const isAllowedDataUri =
      allowed.includes('data:') &&
      trimmed.length <= MAX_SELF_COPY_DATA_URI_LENGTH &&
      SELF_COPY_DATA_IMAGE_PATTERN.test(trimmed)
    if (!isAllowedDataUri) return false
    if (dataUriBudget) {
      if (trimmed.length > dataUriBudget.remaining) return false
      dataUriBudget.remaining -= trimmed.length
    }
    return true
  }
  try {
    const parsed = new URL(trimmed)
    return allowed.includes(parsed.protocol)
  } catch {
    return false
  }
}
