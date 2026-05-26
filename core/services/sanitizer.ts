import DOMPurify from 'isomorphic-dompurify'

type SanitizationProfile = 'default' | 'editor-self-copy'

type SanitizeOptions = {
  profile?: SanitizationProfile
}

const DEFAULT_ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'hr', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'span', 'div', 'img', 'mark', 'u', 's', 'strike',
]

const SELF_COPY_ALLOWED_TAGS = [
  ...DEFAULT_ALLOWED_TAGS,
  'label',
  'input',
]

const DEFAULT_ALLOWED_ATTR = ['href', 'target', 'src', 'alt', 'class', 'style', 'title']
const DEFAULT_ALLOWED_DATA_ATTR = ['data-checked', 'data-type']

const SELF_COPY_ALLOWED_ATTR = [
  ...DEFAULT_ALLOWED_ATTR,
  ...DEFAULT_ALLOWED_DATA_ATTR,
  'type',
  'checked',
  'disabled',
]

export class SanitizationService {
  /**
   * Sanitizes HTML content to prevent XSS attacks.
   * Allows safe tags like <b>, <i>, <p>, lists, etc.
   * Removes <script>, <iframe>, and other dangerous tags.
   */
  static sanitize(html: string, options: SanitizeOptions = {}): string {
    const profile = options.profile ?? 'default'
    const isEditorSelfCopy = profile === 'editor-self-copy'
    const config = {
      ALLOWED_TAGS: isEditorSelfCopy ? SELF_COPY_ALLOWED_TAGS : DEFAULT_ALLOWED_TAGS,
      ALLOWED_ATTR: isEditorSelfCopy
        ? SELF_COPY_ALLOWED_ATTR
        : [...DEFAULT_ALLOWED_ATTR, ...DEFAULT_ALLOWED_DATA_ATTR],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: isEditorSelfCopy
        ? ['script', 'iframe', 'object', 'embed', 'form', 'button']
        : ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    }

    try {
      return DOMPurify.sanitize(html, config)
    } catch {
      return fallbackSanitizeHtml(html, config.FORBID_TAGS)
    }
  }

  /**
   * Strips all HTML tags, returning only text.
   * Useful for generating plain text previews or search indexing.
   */
  static stripHtml(html: string): string {
    try {
      // First pass: use DOMPurify to remove dangerous tags AND their content.
      // KEEP_CONTENT: false ensures script/style inner text doesn't leak.
      const safe = DOMPurify.sanitize(html, {
        FORBID_TAGS: ['script', 'style'],
        FORBID_CONTENTS: ['script', 'style'],
      })
      // Second pass: strip all remaining tags, leaving only text.
      return DOMPurify.sanitize(safe, { ALLOWED_TAGS: [] })
    } catch {
      return fallbackStripHtml(html)
    }
  }
}

function fallbackSanitizeHtml(html: string, forbiddenTags?: string[]): string {
  if (!html) return ''

  const withoutForbiddenTags = removeTagBlocks(html, forbiddenTags ?? [])
  return escapeHtml(stripHtmlTags(withoutForbiddenTags))
}

function fallbackStripHtml(html: string): string {
  return stripHtmlTags(removeTagBlocks(html, ['script', 'style']))
}

function removeTagBlocks(html: string, tagNames: string[]): string {
  let sanitized = html

  for (const tag of tagNames) {
    const escapedTag = escapeRegExp(tag)
    sanitized = sanitized
      .replace(new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, 'gi'), '')
      .replace(new RegExp(`<${escapedTag}\\b[^>]*\\/?>`, 'gi'), '')
  }

  return sanitized
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
