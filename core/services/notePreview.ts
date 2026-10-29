import { Parser } from 'htmlparser2'
import { SanitizationService } from './sanitizer'

const BLOCK_ELEMENTS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
])
const RICH_TEXT_ELEMENTS = new Set([
  ...BLOCK_ELEMENTS, 'a', 'b', 'code', 'em', 'i', 'img', 'input', 'label',
  'mark', 's', 'span', 'strike', 'strong', 'sub', 'sup', 'u',
])
const NON_TEXT_ELEMENTS = new Set([
  'annotation-xml', 'audio', 'foreignobject', 'head', 'iframe', 'math',
  'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'selectedcontent',
  'style', 'svg', 'template', 'title', 'video', 'xmp',
])
const POSSIBLE_MARKUP = /<[a-z!/?]/i
const normalizePreviewWhitespace = (text: string) => text.replace(/[ \t\r\n\f]+/g, ' ').replace(/^ +| +$/g, '')

function readPreviewText(content: string, decodeEntities: boolean) {
  const parts: string[] = []
  let recognizedMarkup = false
  let hiddenDepth = 0

  // htmlparser2 tokenizes strings without creating DOM nodes. A note's remote
  // images and other resources cannot load while its preview is being built.
  const parser = new Parser({
    onopentag(name) {
      if (hiddenDepth) {
        hiddenDepth++
      } else if (NON_TEXT_ELEMENTS.has(name)) {
        hiddenDepth = 1
      } else {
        if (RICH_TEXT_ELEMENTS.has(name)) recognizedMarkup = true
        if (BLOCK_ELEMENTS.has(name)) parts.push(' ')
      }
    },
    ontext(text) {
      if (!hiddenDepth) parts.push(text)
    },
    onclosetag(name) {
      if (hiddenDepth) {
        hiddenDepth--
      } else if (BLOCK_ELEMENTS.has(name)) {
        parts.push(' ')
      }
    },
  }, { decodeEntities })
  parser.end(content)
  return { text: parts.join(''), recognizedMarkup }
}

/** A safe, single-line preview without changing the meaning of inline markup. */
export function notePreview(content: string): string {
  if (!POSSIBLE_MARKUP.test(content)) {
    // Preserve the existing interpretation of ambiguous legacy entity text.
    return normalizePreviewWhitespace(SanitizationService.stripHtml(content))
  }

  const preview = readPreviewText(content, true)
  if (preview.recognizedMarkup) return normalizePreviewWhitespace(preview.text)

  // Unknown markup is not reliable evidence that legacy text is HTML. Strip
  // its tags without decoding entities, then preserve the old sanitizer's
  // escaping semantics. Only escaped text and a static span reach the DOM.
  const text = readPreviewText(content, false).text.replace(/</g, '&lt;')
  return normalizePreviewWhitespace(SanitizationService.stripHtml(`${text}<span></span>`))
}
