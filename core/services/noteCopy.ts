import { SanitizationService } from '@core/services/sanitizer'
import { normalizeHtml } from '@core/utils/normalize-html'

export const EVERFREENOTE_COPY_ATTRIBUTE = 'data-everfreenote-copy'
export const EVERFREENOTE_COPY_KIND = 'note-body'

export type NoteCopyPayload = {
  html: string
  text: string
}

const SELF_COPY_WRAPPER_PREFIX = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">`
const DIV_TAG_PATTERN = /<\/?div\b[^>]*>/gi

export const NoteCopyService = {
  buildPayload(rawHtml: string): NoteCopyPayload {
    const sanitizedHtml = SanitizationService.sanitize(normalizeHtml(rawHtml), {
      profile: 'editor-self-copy',
    })

    return {
      html: wrapSelfCopyHtml(sanitizedHtml),
      text: htmlToPlainText(sanitizedHtml),
    }
  },

  isSelfCopyHtml(html: string): boolean {
    if (!html) return false
    const normalizedHtml = html.trim()

    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(
          SanitizationService.sanitize(normalizedHtml, { profile: 'editor-self-copy' }),
          'text/html',
        )
        if (typeof doc.body.querySelector === 'function') {
          return Boolean(doc.body.querySelector(`[${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"]`))
        }
      } catch {
        // Fall back to regex matching below.
      }
    }

    return unwrapSelfCopyHtmlFallback(normalizedHtml) !== null
  },

  unwrapSelfCopyHtml(html: string): string {
    if (!html) return ''
    const normalizedHtml = html.trim()

    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(
          SanitizationService.sanitize(normalizedHtml, { profile: 'editor-self-copy' }),
          'text/html',
        )
        const queryResult =
          typeof doc.body.querySelector === 'function'
            ? doc.body.querySelector(`[${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"]`)
            : null
        if (queryResult && 'innerHTML' in queryResult && typeof queryResult.innerHTML === 'string') {
          return queryResult.innerHTML
        }
      } catch {
        // Fall back to regex matching below.
      }
    }

    return unwrapSelfCopyHtmlFallback(normalizedHtml) ?? normalizedHtml
  },
}

function wrapSelfCopyHtml(html: string): string {
  return `${SELF_COPY_WRAPPER_PREFIX}${html}</div>`
}

function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<li([^>]*)data-checked=["']true["'][^>]*>/gi, '- [x] ')
    .replace(/<li([^>]*)data-checked=["']false["'][^>]*>/gi, '- [ ] ')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(p|div|blockquote|pre|h[1-6])>/gi, '\n\n')
    .replace(/<\/(ul|ol)>/gi, '\n')

  const stripped = SanitizationService.stripHtml(withBreaks)
  return decodeHtmlEntities(stripped)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === 'undefined') {
    return value
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function unwrapSelfCopyHtmlFallback(html: string): string | null {
  if (!html.startsWith(SELF_COPY_WRAPPER_PREFIX)) {
    return null
  }

  let depth = 0
  let closingTagStart = -1
  let closingTagEnd = -1

  for (const match of html.matchAll(DIV_TAG_PATTERN)) {
    const fullTag = match[0]
    const index = match.index ?? -1
    if (index < 0) continue

    if (fullTag.startsWith('</')) {
      depth -= 1
      if (depth === 0) {
        closingTagStart = index
        closingTagEnd = index + fullTag.length
        break
      }
      continue
    }

    depth += 1
  }

  if (closingTagStart < 0 || closingTagEnd < 0) {
    return null
  }

  if (html.slice(closingTagEnd).trim().length > 0) {
    return null
  }

  return html.slice(SELF_COPY_WRAPPER_PREFIX.length, closingTagStart)
}
