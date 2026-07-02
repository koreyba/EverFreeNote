import { SanitizationService } from '@core/services/sanitizer'

export const EVERFREENOTE_COPY_ATTRIBUTE = 'data-everfreenote-copy'
export const EVERFREENOTE_COPY_KIND = 'note-body'

const SELF_COPY_WRAPPER_PREFIX = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">`
const DIV_TAG_PATTERN = /<\/?div\b[^>]*>/gi

export const NoteCopyService = {
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
