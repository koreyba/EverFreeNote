const CYRILLIC_MAP: Record<string, string> = {
  '\u0430': 'a',
  '\u0431': 'b',
  '\u0432': 'v',
  '\u0433': 'g',
  '\u0434': 'd',
  '\u0435': 'e',
  '\u0451': 'e',
  '\u0436': 'zh',
  '\u0437': 'z',
  '\u0438': 'i',
  '\u0439': 'i',
  '\u043a': 'k',
  '\u043b': 'l',
  '\u043c': 'm',
  '\u043d': 'n',
  '\u043e': 'o',
  '\u043f': 'p',
  '\u0440': 'r',
  '\u0441': 's',
  '\u0442': 't',
  '\u0443': 'u',
  '\u0444': 'f',
  '\u0445': 'h',
  '\u0446': 'ts',
  '\u0447': 'ch',
  '\u0448': 'sh',
  '\u0449': 'shch',
  '\u044a': '',
  '\u044b': 'y',
  '\u044c': '',
  '\u044d': 'e',
  '\u044e': 'yu',
  '\u044f': 'ya',
  '\u0454': 'ie',
  '\u0456': 'i',
  '\u0457': 'i',
  '\u0491': 'g',
}

const MAX_SLUG_LENGTH = 96
const FALLBACK_SLUG = 'note'

const normalizeLatin = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

export const slugifyLatin = (value: string): string => {
  const input = normalizeLatin(value.trim().toLowerCase())
  let result = ''

  for (const ch of input) {
    if (/[a-z0-9]/.test(ch)) {
      result += ch
      continue
    }

    if (CYRILLIC_MAP[ch]) {
      result += CYRILLIC_MAP[ch]
      continue
    }

    if (/\s|[-_./\\]/.test(ch)) {
      result += '-'
    }
  }

  result = result
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')

  if (!result) return FALLBACK_SLUG
  if (result.length <= MAX_SLUG_LENGTH) return result

  return result
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '') || FALLBACK_SLUG
}

export const validateWordPressSlug = (slug: string): string | null => {
  const value = slug.trim()
  if (!value) return 'Slug is required.'
  if (value.length > MAX_SLUG_LENGTH) {
    return `Slug is too long (max ${MAX_SLUG_LENGTH} chars).`
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase latin letters, digits, and hyphen only.'
  }
  return null
}

export const normalizeExportTags = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawTag of tags) {
    const tag = rawTag.trim()
    if (!tag) continue
    const key = tag.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(tag)
  }

  return normalized
}

export const getPublishedTagForSite = (siteUrl: string): string | null => {
  const raw = siteUrl.trim().toLowerCase()
  if (!raw) return null

  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`

  try {
    const hostname = new URL(withScheme).hostname.replace(/\.+$/, '')
    if (!hostname) return null
    return `${hostname}_published`
  } catch {
    return null
  }
}
