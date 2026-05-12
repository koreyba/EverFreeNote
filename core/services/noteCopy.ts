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
        return isTopLevelSelfCopyWrapper(doc.body)
      } catch {
        // Fall back to regex matching below.
      }
    }

    return unwrapSelfCopyHtmlFallback(normalizedHtml) !== null
  },

  unwrapSelfCopyHtml(html: string): string {
    if (!html) return ''
    const normalizedHtml = html.trim()
    const sanitizedHtml = SanitizationService.sanitize(normalizedHtml, { profile: 'editor-self-copy' })

    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(sanitizedHtml, 'text/html')
        const wrapper = getTopLevelSelfCopyWrapper(doc.body)
        if (wrapper) {
          return wrapper.innerHTML
        }
      } catch {
        // Fall back to regex matching below.
      }
    }

    const unwrappedFallback = unwrapSelfCopyHtmlFallback(normalizedHtml)
    if (unwrappedFallback !== null) {
      return SanitizationService.sanitize(unwrappedFallback, { profile: 'editor-self-copy' })
    }
    return sanitizedHtml
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
  const normalizedText = decodeHtmlEntities(stripped).replaceAll('\u00a0', ' ')
  return collapseExtraBlankLines(trimLineEndings(normalizedText)).trim()
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === 'undefined') {
    return value
  }

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function trimLineEndings(value: string): string {
  return value
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
}

function collapseExtraBlankLines(value: string): string {
  const lines = value.split('\n')
  const collapsed: string[] = []
  let blankLineCount = 0

  for (const line of lines) {
    if (line.length === 0) {
      blankLineCount += 1
      if (blankLineCount <= 2) {
        collapsed.push(line)
      }
      continue
    }

    blankLineCount = 0
    collapsed.push(line)
  }

  return collapsed.join('\n')
}

function isTopLevelSelfCopyWrapper(body: HTMLElement): boolean {
  return getTopLevelSelfCopyWrapper(body) !== null
}

function getTopLevelSelfCopyWrapper(body: HTMLElement): Element | null {
  const wrapper = body.firstElementChild
  if (!wrapper || body.children.length !== 1) {
    return null
  }

  if (wrapper.tagName.toLowerCase() !== 'div') {
    return null
  }

  return wrapper.getAttribute(EVERFREENOTE_COPY_ATTRIBUTE) === EVERFREENOTE_COPY_KIND ? wrapper : null
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
