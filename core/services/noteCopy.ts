import { SanitizationService } from '@core/services/sanitizer'
import { normalizeHtml } from '@core/utils/normalize-html'

export const EVERFREENOTE_COPY_ATTRIBUTE = 'data-everfreenote-copy'
export const EVERFREENOTE_COPY_KIND = 'note-body'

export type NoteCopyPayload = {
  html: string
  text: string
}

const WRAPPER_PATTERN = new RegExp(
  `<div[^>]*${EVERFREENOTE_COPY_ATTRIBUTE}=["']${EVERFREENOTE_COPY_KIND}["'][^>]*>([\\s\\S]*)<\\/div>`,
  'i',
)

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

    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        if (typeof doc.body.querySelector === 'function') {
          return Boolean(doc.body.querySelector(`[${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"]`))
        }
      } catch {
        // Fall back to regex matching below.
      }
    }

    return WRAPPER_PATTERN.test(html)
  },

  unwrapSelfCopyHtml(html: string): string {
    if (!html) return ''

    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html')
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

    const match = html.match(WRAPPER_PATTERN)
    return match?.[1] ?? html
  },
}

function wrapSelfCopyHtml(html: string): string {
  return `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">${html}</div>`
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
