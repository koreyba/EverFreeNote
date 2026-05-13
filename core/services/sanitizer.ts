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

const SELF_CLOSING_TAGS = new Set(['br', 'hr', 'img', 'input'])

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
      return fallbackSanitizeHtml(html, config)
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

function fallbackSanitizeHtml(html: string, config: {
  ALLOWED_TAGS?: string[]
  ALLOWED_ATTR?: string[]
  FORBID_TAGS?: string[]
  FORBID_ATTR?: string[]
}): string {
  if (!html) return ''

  const allowedTags = Array.isArray(config.ALLOWED_TAGS)
    ? new Set(config.ALLOWED_TAGS.map(tag => String(tag).toLowerCase()))
    : null
  const forbiddenTags = new Set(
    Array.isArray(config.FORBID_TAGS)
      ? config.FORBID_TAGS.map(tag => String(tag).toLowerCase())
      : []
  )

  const stripped = stripForbiddenBlocks(html, forbiddenTags)

  return stripped.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (full, rawTagName, rawAttributes) => {
    const tagName = String(rawTagName).toLowerCase()
    const isClosing = full.startsWith('</')
    const isAllowed = !allowedTags || allowedTags.has(tagName)

    if (forbiddenTags.has(tagName) || !isAllowed) {
      return ''
    }

    if (isClosing) {
      return SELF_CLOSING_TAGS.has(tagName) ? '' : `</${tagName}>`
    }

    const attributes = sanitizeAttributes(rawAttributes, config)
    if (SELF_CLOSING_TAGS.has(tagName)) {
      return `<${tagName}${attributes} />`
    }

    return `<${tagName}${attributes}>`
  })
}

function fallbackStripHtml(html: string): string {
  return stripForbiddenBlocks(html, new Set(['script', 'style'])).replace(/<[^>]*>/g, '')
}

function stripForbiddenBlocks(html: string, forbiddenTags: Set<string>): string {
  let sanitized = html

  for (const tag of forbiddenTags) {
    const escapedTag = escapeRegExp(tag)
    sanitized = sanitized
      .replace(new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, 'gi'), '')
      .replace(new RegExp(`<${escapedTag}\\b[^>]*\\/?>`, 'gi'), '')
  }

  return sanitized
}

function sanitizeAttributes(rawAttributes: string, config: {
  ALLOWED_ATTR?: string[]
  FORBID_ATTR?: string[]
}): string {
  const allowedAttrs = Array.isArray(config.ALLOWED_ATTR)
    ? new Set(config.ALLOWED_ATTR.map(attr => String(attr).toLowerCase()))
    : null
  const forbiddenAttrs = new Set(
    Array.isArray(config.FORBID_ATTR)
      ? config.FORBID_ATTR.map(attr => String(attr).toLowerCase())
      : []
  )

  const sanitized: string[] = []
  for (const attribute of parseAttributes(rawAttributes)) {
    if (forbiddenAttrs.has(attribute.name) || attribute.name.startsWith('on')) {
      continue
    }
    if (allowedAttrs && !allowedAttrs.has(attribute.name)) {
      continue
    }
    if (
      (attribute.name === 'href' || attribute.name === 'src') &&
      /^\s*javascript:/i.test(attribute.value)
    ) {
      continue
    }

    sanitized.push(`${attribute.name}="${attribute.value}"`)
  }

  return sanitized.length > 0 ? ` ${sanitized.join(' ')}` : ''
}

function parseAttributes(source: string): Array<{ name: string; value: string }> {
  const attributes: Array<{ name: string; value: string }> = []
  const pattern = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? '',
    })
  }

  return attributes
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
