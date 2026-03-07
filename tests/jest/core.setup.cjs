const SELF_CLOSING_TAGS = new Set(['br', 'hr', 'img', 'input'])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseAttributes(source) {
  const attributes = []
  const pattern = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match

  while ((match = pattern.exec(source)) !== null) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? '',
    })
  }

  return attributes
}

function stripForbiddenBlocks(html, forbiddenTags) {
  let sanitized = html

  for (const tag of forbiddenTags) {
    const escapedTag = escapeRegExp(tag)
    sanitized = sanitized
      .replace(new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?<\\/${escapedTag}>`, 'gi'), '')
      .replace(new RegExp(`<${escapedTag}\\b[^>]*\\/?>`, 'gi'), '')
  }

  return sanitized
}

function sanitizeAttributes(rawAttributes, config) {
  const allowedAttrs = Array.isArray(config.ALLOWED_ATTR)
    ? new Set(config.ALLOWED_ATTR.map((attr) => String(attr).toLowerCase()))
    : null
  const forbiddenAttrs = new Set(
    Array.isArray(config.FORBID_ATTR)
      ? config.FORBID_ATTR.map((attr) => String(attr).toLowerCase())
      : []
  )

  const sanitized = []
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

    if (attribute.name === 'style') {
      const allowedStyles = sanitizeStyleAttribute(attribute.value, config.ALLOWED_STYLES)
      if (!allowedStyles) {
        continue
      }
      sanitized.push(`style="${allowedStyles}"`)
      continue
    }

    sanitized.push(`${attribute.name}="${attribute.value}"`)
  }

  return sanitized.length > 0 ? ` ${sanitized.join(' ')}` : ''
}

function sanitizeStyleAttribute(styleValue, allowedStylesConfig) {
  if (!allowedStylesConfig || typeof allowedStylesConfig !== 'object') {
    return styleValue
  }

  const wildcardRules = allowedStylesConfig['*']
  if (!wildcardRules || typeof wildcardRules !== 'object') {
    return ''
  }

  const sanitizedDeclarations = styleValue
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawProperty, ...rawValueParts] = entry.split(':')
      if (!rawProperty || rawValueParts.length === 0) {
        return null
      }

      const property = rawProperty.trim().toLowerCase()
      const value = rawValueParts.join(':').trim()
      const matchers = wildcardRules[property]

      if (!Array.isArray(matchers) || matchers.length === 0) {
        return null
      }

      return matchers.some((matcher) => matcher.test(value))
        ? `${property}: ${value}`
        : null
    })
    .filter(Boolean)

  return sanitizedDeclarations.join('; ')
}

function sanitizeHtml(html, config = {}) {
  if (!html) return ''

  const allowedTags = Array.isArray(config.ALLOWED_TAGS)
    ? new Set(config.ALLOWED_TAGS.map((tag) => String(tag).toLowerCase()))
    : null
  const forbiddenTags = new Set(
    Array.isArray(config.FORBID_TAGS)
      ? config.FORBID_TAGS.map((tag) => String(tag).toLowerCase())
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

afterEach(() => {
  jest.clearAllMocks()
})

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html, config) => sanitizeHtml(html, config)),
  },
}))
