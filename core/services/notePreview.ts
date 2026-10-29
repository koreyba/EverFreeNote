import DOMPurify from 'isomorphic-dompurify'
import { SanitizationService } from './sanitizer'

const BLOCK_ELEMENTS = [
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]
const BLOCK_SELECTOR = BLOCK_ELEMENTS.join(',')
const POSSIBLE_BLOCK = new RegExp(`<\\/?(?:${BLOCK_ELEMENTS.join('|')})(?=[\\s/>])`, 'i')
const normalizePreviewWhitespace = (text: string) => text.replace(/[ \t\r\n\f]+/g, ' ').replace(/^ +| +$/g, '')

/** A safe, single-line preview without changing the meaning of inline markup. */
export function notePreview(content: string): string {
  if (!POSSIBLE_BLOCK.test(content)) {
    // Preserve the existing interpretation of ambiguous legacy entity text.
    return normalizePreviewWhitespace(SanitizationService.stripHtml(content))
  }

  // Sanitize before adding separators so markup inside scripts and attributes
  // cannot be mistaken for visible block boundaries.
  const fragment = DOMPurify.sanitize(content, {
    FORBID_TAGS: ['script', 'style'],
    FORBID_CONTENTS: ['script', 'style'],
    RETURN_DOM_FRAGMENT: true,
  })
  for (const element of Array.from(fragment.querySelectorAll(BLOCK_SELECTOR))) {
    element.before(element.ownerDocument.createTextNode(' '))
    element.after(element.ownerDocument.createTextNode(' '))
  }
  return normalizePreviewWhitespace(DOMPurify.sanitize(fragment, { ALLOWED_TAGS: [] }))
}
